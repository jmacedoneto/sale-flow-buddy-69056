import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[sync-chatwoot-completo] Iniciando sync...');
    
    const { card_id, funil_nome, funil_etapa, data_retorno, chat_conv_id, config } = await req.json();
    
    if (!chat_conv_id || !config) {
      console.log('[sync-chatwoot-completo] Dados insuficientes');
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing required data' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Determinar chave etapa (comercial vs admin)
    const etapa_key = funil_nome === 'Comercial' ? 'etapa_comercial' : 'funil_etapa';
    
    console.log(`[sync-chatwoot-completo] Usando chave: ${etapa_key} para funil: ${funil_nome}`);

    // Preparar custom attributes
    const attrs: Record<string, any> = {
      nome_do_funil: funil_nome,
      [etapa_key]: funil_etapa,
      data_retorno: data_retorno || null
    };

    console.log('[sync-chatwoot-completo] Attributes:', JSON.stringify(attrs));

    // Sync com Chatwoot
    const chatwootUrl = `${config.url}/api/v1/accounts/${config.account_id}/conversations/${chat_conv_id}/custom_attributes`;
    
    const response = await fetch(chatwootUrl, {
      method: 'POST',
      headers: {
        'api_access_token': config.api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ custom_attributes: attrs }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[sync-chatwoot-completo] Erro na API Chatwoot:', errorText);
      return new Response(
        JSON.stringify({ ok: false, error: errorText }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('[sync-chatwoot-completo] Sync concluído com sucesso');
    
    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('[sync-chatwoot-completo] Erro:', error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
