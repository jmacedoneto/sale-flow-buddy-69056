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

    const { conversation_id, nome_do_funil, funil_etapa, data_retorno } = await req.json();

    console.log('[sync-chatwoot] Iniciando sincronização...');
    console.log(`[sync-chatwoot] Conversation ID: ${conversation_id}`);

    // Buscar configuração do Chatwoot
    const { data: config, error: configError } = await supabase
      .from('integracao_chatwoot')
      .select('account_id, url')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configError || !config) {
      console.error('[sync-chatwoot] Config não encontrada:', configError);
      // Não falhar - apenas logar
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuração do Chatwoot não encontrada',
          logged: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // API Key do ambiente
    const apiKey = Deno.env.get('CHATWOOT_API_KEY');
    if (!apiKey) {
      console.error('[sync-chatwoot] CHATWOOT_API_KEY não configurado');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'CHATWOOT_API_KEY não configurado no ambiente',
          logged: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chatwootUrl = config.url.replace(/\/$/, ''); // Remove trailing slash
    const accountId = config.account_id;

    console.log('[sync-chatwoot] Sincronizando custom attributes...');

    // Atualizar custom attributes no Chatwoot
    const response = await fetch(
      `${chatwootUrl}/api/v1/accounts/${accountId}/conversations/${conversation_id}/custom_attributes`,
      {
        method: 'POST',
        headers: {
          'api_access_token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          custom_attributes: {
            nome_do_funil,
            funil_etapa,
            data_retorno,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[sync-chatwoot] Erro ao atualizar Chatwoot:', errorText);
      // Não falhar - apenas logar
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao atualizar Chatwoot',
          details: errorText,
          logged: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[sync-chatwoot] Sincronização concluída com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Sincronizado com Chatwoot com sucesso'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-chatwoot] Erro fatal:', error);
    // Não falhar - apenas logar
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: String(error),
        logged: true 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
