import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncPayload {
  conversation_id: number;
  funil_etapa?: string;
  data_retorno?: string;
  etapa_comercial?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('OK', { headers: corsHeaders });
  }

  const startTime = Date.now();
  let conversationId: number | null = null;

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get Chatwoot config
    const { data: config } = await supabase
      .from('integracao_chatwoot')
      .select('url, account_id, api_key')
      .eq('status', 'ativo')
      .maybeSingle();

    if (!config || !config.api_key) {
      console.error('[sync-chatwoot] No active Chatwoot config found');
      
      // Log error
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'lovable_to_chatwoot',
        status: 'error',
        event_type: 'config_missing',
        error_message: 'Chatwoot não configurado ou API key ausente',
        latency_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({ success: false, error: 'Chatwoot não configurado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const payload: SyncPayload = await req.json();
    conversationId = payload.conversation_id;
    const { funil_etapa, data_retorno, etapa_comercial } = payload;

    if (!conversationId) {
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'lovable_to_chatwoot',
        status: 'error',
        event_type: 'sync_request',
        error_message: 'conversation_id é obrigatório',
        latency_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({ success: false, error: 'conversation_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-chatwoot] Syncing conversation ${conversationId} to Chatwoot`);

    // Build custom_attributes to update
    const custom_attributes: Record<string, any> = {};

    if (funil_etapa) {
      custom_attributes.funil_etapa = funil_etapa;
    }

    if (data_retorno) {
      custom_attributes.data_retorno = data_retorno;
    }

    if (etapa_comercial) {
      custom_attributes.etapa_comercial = etapa_comercial;
    }

    // Check if there's anything to update
    if (Object.keys(custom_attributes).length === 0) {
      console.log('[sync-chatwoot] No attributes to update, skipping');
      
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'lovable_to_chatwoot',
        conversation_id: conversationId,
        status: 'warning',
        event_type: 'no_changes',
        error_message: 'Nenhum atributo para sincronizar',
        latency_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({ success: true, message: 'No changes to sync' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Make PUT request to Chatwoot API
    const chatwootUrl = `${config.url}/api/v1/accounts/${config.account_id}/conversations/${conversationId}`;
    
    console.log(`[sync-chatwoot] Updating Chatwoot: ${chatwootUrl}`);
    console.log(`[sync-chatwoot] Custom attributes:`, custom_attributes);

    const response = await fetch(chatwootUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': config.api_key,
      },
      body: JSON.stringify({ custom_attributes }),
    });

    const latency = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[sync-chatwoot] Chatwoot API error: ${response.status} - ${errorText}`);
      
      // Log error
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'lovable_to_chatwoot',
        conversation_id: conversationId,
        status: 'error',
        event_type: 'api_error',
        error_message: `Chatwoot API ${response.status}: ${errorText.substring(0, 200)}`,
        latency_ms: latency,
        payload: custom_attributes,
      });

      return new Response(
        JSON.stringify({ success: false, error: `Chatwoot API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log(`[sync-chatwoot] Successfully synced to Chatwoot`);

    // Log success
    await supabase.from('webhook_sync_logs').insert({
      sync_type: 'lovable_to_chatwoot',
      conversation_id: conversationId,
      status: 'success',
      event_type: 'sync_success',
      latency_ms: latency,
      payload: custom_attributes,
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Synced to Chatwoot', data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync-chatwoot] Fatal error:', error);
    
    // Log fatal error
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      await supabase.from('webhook_sync_logs').insert({
        sync_type: 'lovable_to_chatwoot',
        conversation_id: conversationId,
        status: 'error',
        event_type: 'fatal_error',
        error_message: String(error).substring(0, 500),
        latency_ms: Date.now() - startTime,
      });
    } catch (logError) {
      console.error('[sync-chatwoot] Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
