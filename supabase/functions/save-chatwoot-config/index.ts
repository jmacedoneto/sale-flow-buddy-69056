import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { url, account_id, label } = await req.json();

    console.log('[save-chatwoot-config] Salvando configuração do Chatwoot...');
    console.log('[save-chatwoot-config] URL:', url);
    console.log('[save-chatwoot-config] Account ID:', account_id);
    console.log('[save-chatwoot-config] Label:', label);

    // Validações
    if (!url || !account_id) {
      return new Response(
        JSON.stringify({ error: 'URL e Account ID são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remover barra final da URL se existir
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;

    // Verificar se já existe configuração
    const { data: existing } = await supabase
      .from('integracao_chatwoot')
      .select('id')
      .limit(1)
      .maybeSingle();

    let result;
    if (existing) {
      // Atualizar configuração existente
      result = await supabase
        .from('integracao_chatwoot')
        .update({
          url: cleanUrl,
          account_id: parseInt(account_id),
          label: label || 'KANBAN_CRM',
          status: 'ativo',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Criar nova configuração
      result = await supabase
        .from('integracao_chatwoot')
        .insert({
          url: cleanUrl,
          account_id: parseInt(account_id),
          label: label || 'KANBAN_CRM',
          status: 'ativo',
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('[save-chatwoot-config] Erro ao salvar:', result.error);
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[save-chatwoot-config] Configuração salva com sucesso:', result.data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Configuração salva com sucesso',
        config: {
          id: result.data.id,
          url: result.data.url,
          account_id: result.data.account_id,
          label: result.data.label,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[save-chatwoot-config] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
