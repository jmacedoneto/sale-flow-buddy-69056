import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[Test Chatwoot API] Buscando configuração...');

    // Buscar config do banco
    const { data: config, error: configError } = await supabase
      .from('integracao_chatwoot')
      .select('*')
      .single();

    if (configError || !config) {
      throw new Error(`Configuração não encontrada: ${configError?.message}`);
    }

    console.log('[Test Chatwoot API] Config encontrada:', {
      url: config.url,
      account_id: config.account_id,
      has_api_key: !!config.api_key
    });

    // Testar conexão com API Chatwoot
    const chatwootUrl = `${config.url}/api/v1/accounts/${config.account_id}/conversations`;
    console.log('[Test Chatwoot API] Testando URL:', chatwootUrl);

    const response = await fetch(chatwootUrl, {
      method: 'GET',
      headers: {
        'api_access_token': config.api_key,
        'Content-Type': 'application/json',
      },
    });

    console.log('[Test Chatwoot API] Status da resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Test Chatwoot API] Erro na resposta:', errorText);
      throw new Error(`Erro API Chatwoot: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Test Chatwoot API] Sucesso! Conversas encontradas:', data?.data?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conexão com Chatwoot estabelecida com sucesso',
        config: {
          url: config.url,
          account_id: config.account_id,
        },
        conversations_count: data?.data?.length || 0,
        status: response.status,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[Test Chatwoot API] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
