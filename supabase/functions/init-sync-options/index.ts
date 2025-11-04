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

    console.log('[init-sync-options] Iniciando sincronização...');

    // Buscar configuração do Chatwoot
    const { data: config, error: configError } = await supabase
      .from('integracao_chatwoot')
      .select('api_key, account_id, url')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (configError || !config) {
      console.error('[init-sync-options] Config não encontrada:', configError);
      return new Response(
        JSON.stringify({ error: 'Configuração do Chatwoot não encontrada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar funis
    const { data: funis, error: funisError } = await supabase
      .from('funis')
      .select('nome')
      .order('nome');

    if (funisError) {
      console.error('[init-sync-options] Erro ao buscar funis:', funisError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar funis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar etapas
    const { data: etapas, error: etapasError } = await supabase
      .from('etapas')
      .select('nome')
      .order('nome');

    if (etapasError) {
      console.error('[init-sync-options] Erro ao buscar etapas:', etapasError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar etapas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chatwootUrl = config.url.replace(/\/$/, ''); // Remove trailing slash
    const apiKey = config.api_key;
    const accountId = config.account_id;

    console.log('[init-sync-options] Sincronizando com Chatwoot...');
    console.log(`[init-sync-options] URL: ${chatwootUrl}`);
    console.log(`[init-sync-options] Account ID: ${accountId}`);

    // Sincronizar atributo nome_do_funil
    const funilOptions = funis?.map(f => f.nome) || [];
    console.log('[init-sync-options] Opções de funil:', funilOptions);

    try {
      const funilResponse = await fetch(
        `${chatwootUrl}/api/v1/accounts/${accountId}/custom_attribute_definitions`,
        {
          method: 'POST',
          headers: {
            'api_access_token': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            attribute_display_name: 'Nome do Funil',
            attribute_key: 'nome_do_funil',
            attribute_display_type: 'list',
            attribute_model: 'conversation_attribute',
            attribute_values: funilOptions,
          }),
        }
      );

      if (!funilResponse.ok) {
        const errorText = await funilResponse.text();
        console.error('[init-sync-options] Erro ao criar atributo funil:', errorText);
      } else {
        console.log('[init-sync-options] Atributo nome_do_funil sincronizado');
      }
    } catch (error) {
      console.error('[init-sync-options] Erro ao sincronizar funil:', error);
    }

    // Sincronizar atributo funil_etapa (etapas administrativas)
    const etapaOptions = ['Demanda Aberta', 'Em Resolução', 'Aguardando Retorno', 'Concluído/Arquivado'];
    console.log('[init-sync-options] Opções de etapa admin:', etapaOptions);

    try {
      const etapaResponse = await fetch(
        `${chatwootUrl}/api/v1/accounts/${accountId}/custom_attribute_definitions`,
        {
          method: 'POST',
          headers: {
            'api_access_token': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            attribute_display_name: 'Funil Etapa',
            attribute_key: 'funil_etapa',
            attribute_display_type: 'list',
            attribute_model: 'conversation_attribute',
            attribute_values: etapaOptions,
          }),
        }
      );

      if (!etapaResponse.ok) {
        const errorText = await etapaResponse.text();
        console.error('[init-sync-options] Erro ao criar atributo etapa:', errorText);
      } else {
        console.log('[init-sync-options] Atributo funil_etapa sincronizado');
      }
    } catch (error) {
      console.error('[init-sync-options] Erro ao sincronizar etapa:', error);
    }

    // Sincronizar atributo etapa_comercial (etapas comerciais)
    const etapaComercialOptions = ['Contato Inicial', 'Qualificação Agendada', 'Cotação Enviada | FollowUp', 'Negociação', 'Em Fechamento'];
    console.log('[init-sync-options] Opções de etapa comercial:', etapaComercialOptions);

    try {
      const comercialResponse = await fetch(
        `${chatwootUrl}/api/v1/accounts/${accountId}/custom_attribute_definitions`,
        {
          method: 'POST',
          headers: {
            'api_access_token': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            attribute_display_name: 'Etapa Comercial',
            attribute_key: 'etapa_comercial',
            attribute_display_type: 'list',
            attribute_model: 'conversation_attribute',
            attribute_values: etapaComercialOptions,
          }),
        }
      );

      if (!comercialResponse.ok) {
        const errorText = await comercialResponse.text();
        console.error('[init-sync-options] Erro ao criar atributo etapa_comercial:', errorText);
      } else {
        console.log('[init-sync-options] Atributo etapa_comercial sincronizado');
      }
    } catch (error) {
      console.error('[init-sync-options] Erro ao sincronizar etapa_comercial:', error);
    }

    // Sincronizar atributo data_retorno (tipo date)
    console.log('[init-sync-options] Criando atributo data_retorno...');

    try {
      const dataRetornoResponse = await fetch(
        `${chatwootUrl}/api/v1/accounts/${accountId}/custom_attribute_definitions`,
        {
          method: 'POST',
          headers: {
            'api_access_token': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            attribute_display_name: 'Data de Retorno',
            attribute_key: 'data_retorno',
            attribute_display_type: 'date',
            attribute_model: 'conversation_attribute',
          }),
        }
      );

      if (!dataRetornoResponse.ok) {
        const errorText = await dataRetornoResponse.text();
        console.error('[init-sync-options] Erro ao criar atributo data_retorno:', errorText);
      } else {
        console.log('[init-sync-options] Atributo data_retorno sincronizado');
      }
    } catch (error) {
      console.error('[init-sync-options] Erro ao sincronizar data_retorno:', error);
    }

    console.log('[init-sync-options] Sincronização concluída com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Opções sincronizadas com sucesso (4 custom attributes)',
        funis: funilOptions.length,
        etapas_admin: etapaOptions.length,
        etapas_comercial: etapaComercialOptions.length,
        data_retorno: 'date',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[init-sync-options] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
