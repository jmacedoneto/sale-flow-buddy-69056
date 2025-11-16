import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  conversation_id: number;
  label?: string; // nome do funil
  etapa_comercial?: string; // nome da etapa
}

/**
 * Edge function para sincronizar mudanças do CRM → Chatwoot
 * Atualiza custom attributes da conversa no Chatwoot
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[sync-card-to-chatwoot] Iniciando sync...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[sync-card-to-chatwoot] Auth error:', userError);
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { conversation_id, label, etapa_comercial } = await req.json() as SyncRequest;

    if (!conversation_id) {
      throw new Error('conversation_id é obrigatório');
    }

    console.log('[sync-card-to-chatwoot] Sync request:', { conversation_id, label, etapa_comercial });

    // Buscar configuração do Chatwoot
    const { data: config, error: configError } = await supabase
      .from('integracao_chatwoot')
      .select('*')
      .eq('status', 'ativo')
      .maybeSingle();

    if (configError || !config) {
      console.error('[sync-card-to-chatwoot] Chatwoot config error:', configError);
      throw new Error('Chatwoot integration not configured');
    }

    // Montar custom_attributes
    const customAttributes: Record<string, string> = {};
    
    if (label) {
      customAttributes.label = label;
      customAttributes.nome_do_funil = label;
    }
    
    if (etapa_comercial) {
      customAttributes.funil_etapa = etapa_comercial;
      customAttributes.etapa_comercial = etapa_comercial;
    }

    if (Object.keys(customAttributes).length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum custom attribute para atualizar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar conversa no Chatwoot
    const chatwootUrl = `${config.url}/api/v1/accounts/${config.account_id}/conversations/${conversation_id}`;
    
    console.log('[sync-card-to-chatwoot] Atualizando conversa no Chatwoot:', chatwootUrl);
    console.log('[sync-card-to-chatwoot] Custom attributes:', customAttributes);

    const chatwootResponse = await fetch(chatwootUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': config.api_key,
      },
      body: JSON.stringify({
        custom_attributes: customAttributes,
      }),
    });

    if (!chatwootResponse.ok) {
      const errorText = await chatwootResponse.text();
      console.error('[sync-card-to-chatwoot] Chatwoot API error:', errorText);
      throw new Error(`Erro ao atualizar Chatwoot: ${chatwootResponse.status}`);
    }

    const result = await chatwootResponse.json();
    console.log('[sync-card-to-chatwoot] Sucesso:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Custom attributes atualizados no Chatwoot',
        updated_attributes: customAttributes,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-card-to-chatwoot] Erro:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
