/**
 * Edge Function: chatwoot-test-connection
 * 
 * Responsabilidade (SRP): Testar conexão com Chatwoot de forma segura (server-side)
 * e registrar logs em webhook_sync_logs.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestConnectionPayload {
  url: string;
  account_id: number;
  api_key: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const payload: TestConnectionPayload = await req.json();
    const { url, account_id, api_key } = payload;

    console.log('[chatwoot-test-connection] Iniciando teste de conexão');
    console.log('[chatwoot-test-connection] URL:', url);
    console.log('[chatwoot-test-connection] Account ID:', account_id);

    // Validações (Fail Fast)
    if (!url || !url.trim()) {
      return createErrorResponse('missing_url', 'URL do Chatwoot é obrigatória', 400, startTime);
    }

    if (!account_id || account_id < 1) {
      return createErrorResponse('missing_account_id', 'Account ID inválido', 400, startTime);
    }

    if (!api_key || !api_key.trim()) {
      return createErrorResponse('missing_api_key', 'API Key é obrigatória', 400, startTime);
    }

    // Normalizar URL (remover barra final)
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    const chatwootUrl = `${cleanUrl}/api/v1/accounts/${account_id}/conversations`;

    console.log('[chatwoot-test-connection] Chamando:', chatwootUrl);

    // Chamar Chatwoot API (server-side)
    const response = await fetch(chatwootUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': api_key,
      },
      signal: AbortSignal.timeout(10000), // Timeout de 10s
    });

    const latencyMs = Date.now() - startTime;
    const httpStatus = response.status;

    console.log('[chatwoot-test-connection] Status HTTP:', httpStatus);
    console.log('[chatwoot-test-connection] Latência:', latencyMs, 'ms');

    // Normalizar resposta baseada no status HTTP
    if (response.ok) {
      // 2xx - Sucesso
      const data = await response.json();
      const conversationCount = data?.data?.payload?.length || 0;

      console.log('[chatwoot-test-connection] Conexão OK. Conversas:', conversationCount);

      await logToWebhookSyncLogs({
        sync_type: 'chatwoot_test',
        status: 'success',
        event_type: 'connection_test',
        latency_ms: latencyMs,
        payload: { url: cleanUrl, account_id, http_status: httpStatus },
      });

      return new Response(
        JSON.stringify({
          ok: true,
          status: 'ok',
          http_status: httpStatus,
          message: `Conexão com Chatwoot OK ✅ (${conversationCount} conversas encontradas)`,
          conversation_count: conversationCount,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (httpStatus === 401 || httpStatus === 403) {
      // Auth error
      const errorText = await response.text();
      console.error('[chatwoot-test-connection] Erro de autenticação:', errorText);

      await logToWebhookSyncLogs({
        sync_type: 'chatwoot_test',
        status: 'error',
        event_type: 'connection_test',
        latency_ms: latencyMs,
        error_message: `HTTP ${httpStatus}: Invalid API key or permissions`,
        payload: { url: cleanUrl, account_id, http_status: httpStatus },
      });

      return new Response(
        JSON.stringify({
          ok: false,
          status: 'auth_error',
          http_status: httpStatus,
          message: 'Token inválido ou sem permissão no Chatwoot',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (httpStatus === 404) {
      // Not found
      await logToWebhookSyncLogs({
        sync_type: 'chatwoot_test',
        status: 'error',
        event_type: 'connection_test',
        latency_ms: latencyMs,
        error_message: 'HTTP 404: URL or Account ID incorrect',
        payload: { url: cleanUrl, account_id, http_status: httpStatus },
      });

      return new Response(
        JSON.stringify({
          ok: false,
          status: 'not_found',
          http_status: httpStatus,
          message: 'URL ou Account ID incorretos',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Outros erros HTTP
      const errorText = await response.text();
      console.error('[chatwoot-test-connection] Erro HTTP:', httpStatus, errorText);

      await logToWebhookSyncLogs({
        sync_type: 'chatwoot_test',
        status: 'error',
        event_type: 'connection_test',
        latency_ms: latencyMs,
        error_message: `HTTP ${httpStatus}: ${errorText}`,
        payload: { url: cleanUrl, account_id, http_status: httpStatus },
      });

      return new Response(
        JSON.stringify({
          ok: false,
          status: 'unknown',
          http_status: httpStatus,
          message: `Erro inesperado do Chatwoot (HTTP ${httpStatus})`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error('[chatwoot-test-connection] Erro de rede/timeout:', error.message);

    // Determinar se é timeout ou erro de rede
    const isTimeout = error.name === 'TimeoutError' || error.message?.includes('timeout');
    const errorMessage = isTimeout
      ? 'Timeout ao conectar com Chatwoot (10s)'
      : `Erro de rede: ${error.message}`;

    await logToWebhookSyncLogs({
      sync_type: 'chatwoot_test',
      status: 'error',
      event_type: 'connection_test',
      latency_ms: latencyMs,
      error_message: errorMessage,
      payload: { error: error.message },
    });

    return new Response(
      JSON.stringify({
        ok: false,
        status: 'network_error',
        message: 'Não foi possível conectar ao Chatwoot (rede/SSL)',
        details: error.message,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Helper: Criar resposta de erro padronizada
 */
function createErrorResponse(
  status: string,
  message: string,
  httpStatus: number,
  startTime: number
): Response {
  const latencyMs = Date.now() - startTime;

  logToWebhookSyncLogs({
    sync_type: 'chatwoot_test',
    status: 'error',
    event_type: 'connection_test',
    latency_ms: latencyMs,
    error_message: message,
    payload: { validation_error: status },
  });

  return new Response(
    JSON.stringify({
      ok: false,
      status,
      message,
    }),
    { status: httpStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Helper: Registrar log em webhook_sync_logs (SSOT para auditoria)
 */
async function logToWebhookSyncLogs(logData: {
  sync_type: string;
  status: string;
  event_type: string;
  latency_ms: number;
  error_message?: string;
  payload?: any;
  conversation_id?: number | null;
  card_id?: string | null;
}): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error } = await supabase.from('webhook_sync_logs').insert({
      sync_type: logData.sync_type,
      status: logData.status,
      event_type: logData.event_type,
      latency_ms: logData.latency_ms,
      error_message: logData.error_message || null,
      payload: logData.payload || null,
      conversation_id: logData.conversation_id || null,
      card_id: logData.card_id || null,
    });

    if (error) {
      console.error('[chatwoot-test-connection] Erro ao gravar log:', error);
    } else {
      console.log('[chatwoot-test-connection] Log gravado em webhook_sync_logs');
    }
  } catch (err) {
    console.error('[chatwoot-test-connection] Erro fatal ao gravar log:', err);
  }
}
