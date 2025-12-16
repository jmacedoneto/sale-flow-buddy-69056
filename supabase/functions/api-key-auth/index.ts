import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

/**
 * Edge Function para validar API Keys
 * 
 * Uso:
 * - Header: X-API-Key: lv_xxxxxxxxxxxx
 * - Ou Query Param: ?api_key=lv_xxxxxxxxxxxx
 * 
 * Endpoints:
 * POST /validate - Valida uma API Key e retorna os scopes
 * POST /generate - Gera uma nova API Key (requer autenticação de admin)
 * DELETE /revoke - Revoga uma API Key existente
 */

// Função para gerar hash simples (em produção, usar algo mais robusto)
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Função para gerar uma nova API Key
function generateApiKey(): { key: string; prefix: string } {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'lv_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return { key, prefix: key.substring(0, 7) };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(s => s);
    const action = pathSegments[pathSegments.length - 1];

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ========== VALIDAR API KEY ==========
    if (action === 'validate' || req.method === 'GET') {
      const apiKey = req.headers.get('X-API-Key') || 
                     req.headers.get('x-api-key') || 
                     url.searchParams.get('api_key');

      if (!apiKey) {
        return new Response(
          JSON.stringify({ valid: false, error: 'API Key não fornecida' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const keyHash = await hashApiKey(apiKey);

      const { data: apiKeyRecord, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_hash', keyHash)
        .eq('active', true)
        .maybeSingle();

      if (error || !apiKeyRecord) {
        console.log(`[api-key-auth] API Key inválida ou não encontrada`);
        return new Response(
          JSON.stringify({ valid: false, error: 'API Key inválida' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar expiração
      if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ valid: false, error: 'API Key expirada' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Atualizar last_used_at
      await supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', apiKeyRecord.id);

      return new Response(
        JSON.stringify({
          valid: true,
          user_id: apiKeyRecord.user_id,
          scopes: apiKeyRecord.scopes,
          name: apiKeyRecord.name,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== GERAR NOVA API KEY ==========
    if (action === 'generate' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Autenticação necessária' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar se é admin/master
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Token inválido' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar role
      const { data: userCrm } = await supabase
        .from('users_crm')
        .select('role')
        .eq('email', user.email)
        .maybeSingle();

      if (!userCrm || userCrm.role !== 'master') {
        return new Response(
          JSON.stringify({ error: 'Apenas masters podem gerar API Keys' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { name, scopes = ['read'], expires_in_days } = body;

      if (!name) {
        return new Response(
          JSON.stringify({ error: 'Nome da API Key é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { key, prefix } = generateApiKey();
      const keyHash = await hashApiKey(key);
      
      let expiresAt = null;
      if (expires_in_days) {
        expiresAt = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString();
      }

      const { data: newKey, error: insertError } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          name,
          key_hash: keyHash,
          key_prefix: prefix,
          scopes,
          expires_at: expiresAt,
        })
        .select('id, name, key_prefix, scopes, expires_at, created_at')
        .single();

      if (insertError) {
        console.error('[api-key-auth] Erro ao criar API Key:', insertError);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar API Key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // IMPORTANTE: Retornar a key apenas UMA VEZ, na criação
      return new Response(
        JSON.stringify({
          success: true,
          api_key: key, // Mostrar apenas na criação
          key_info: newKey,
          warning: 'Guarde esta chave com segurança. Ela não será exibida novamente.',
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== LISTAR API KEYS ==========
    if (action === 'list' && req.method === 'GET') {
      const authHeader = req.headers.get('Authorization');
      
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Autenticação necessária' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Token inválido' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: keys, error: listError } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, scopes, active, last_used_at, expires_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (listError) {
        return new Response(
          JSON.stringify({ error: 'Erro ao listar API Keys' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ keys }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== REVOGAR API KEY ==========
    if (action === 'revoke' && req.method === 'DELETE') {
      const authHeader = req.headers.get('Authorization');
      
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Autenticação necessária' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Token inválido' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const keyId = url.searchParams.get('id');

      if (!keyId) {
        return new Response(
          JSON.stringify({ error: 'ID da API Key é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: deleteError } = await supabase
        .from('api_keys')
        .update({ active: false })
        .eq('id', keyId)
        .eq('user_id', user.id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: 'Erro ao revogar API Key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'API Key revogada com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação não reconhecida', available_actions: ['validate', 'generate', 'list', 'revoke'] }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[api-key-auth] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
