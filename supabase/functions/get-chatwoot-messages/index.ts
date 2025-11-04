import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatwootMessage {
  id: number;
  content: string;
  account_id: number;
  inbox_id: number;
  conversation_id: number;
  message_type: number;
  created_at: number;
  updated_at: number;
  private: boolean;
  status: string;
  source_id: string;
  content_type: string;
  sender_type: string;
  sender_id: number;
  sender?: {
    id: number;
    name: string;
    email?: string;
    thumbnail?: string;
    type?: string;
  };
  attachments?: any[];
}

interface ChatwootConversationDetail {
  id: number;
  messages: ChatwootMessage[];
  meta: {
    sender: {
      id: number;
      name: string;
      email?: string;
      phone_number?: string;
      thumbnail?: string;
    };
    channel: string;
  };
}

/**
 * Busca mensagens de uma conversa específica do Chatwoot.
 */
async function fetchConversationMessages(
  baseUrl: string,
  apiKey: string,
  accountId: string,
  conversationId: number
): Promise<ChatwootMessage[]> {
  try {
    const url = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`;

    console.log(`[get-chatwoot-messages] === INICIANDO CHAMADA API CHATWOOT ===`);
    console.log(`[get-chatwoot-messages] URL: ${url}`);
    console.log(`[get-chatwoot-messages] Account ID: ${accountId}`);
    console.log(`[get-chatwoot-messages] Conversation ID: ${conversationId}`);
    console.log(`[get-chatwoot-messages] API Key (primeiros 10 chars): ${apiKey.substring(0, 10)}...`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': apiKey,
      },
    });

    console.log(`[get-chatwoot-messages] Response status: ${response.status} ${response.statusText}`);
    console.log(`[get-chatwoot-messages] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[get-chatwoot-messages] === ERRO NA API CHATWOOT ===`);
      console.error(`[get-chatwoot-messages] Status: ${response.status}`);
      console.error(`[get-chatwoot-messages] Response body: ${errorText}`);
      
      // Mensagens de erro específicas por status
      if (response.status === 404) {
        throw new Error(`Conversa ${conversationId} não encontrada no Chatwoot. Verifique se o ID está correto e se a conversa existe na conta ${accountId}.`);
      } else if (response.status === 401) {
        throw new Error(`API Key inválida. Verifique o valor de CHATWOOT_API_KEY. Response: ${errorText}`);
      } else if (response.status === 403) {
        throw new Error(`Acesso negado. Verifique se a API Key tem permissão para acessar esta conversa. Response: ${errorText}`);
      } else {
        throw new Error(`Erro ao buscar mensagens (${response.status}): ${errorText}`);
      }
    }

    const data: ChatwootMessage[] = await response.json();
    console.log(`[get-chatwoot-messages] === SUCESSO ===`);
    console.log(`[get-chatwoot-messages] ${data.length} mensagens encontradas`);
    console.log(`[get-chatwoot-messages] Payload (primeiras 2 mensagens):`, JSON.stringify(data.slice(0, 2), null, 2));

    return data;
  } catch (error) {
    console.error('[get-chatwoot-messages] === ERRO FATAL ===');
    console.error('[get-chatwoot-messages] Tipo de erro:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[get-chatwoot-messages] Mensagem:', error instanceof Error ? error.message : String(error));
    console.error('[get-chatwoot-messages] Stack:', error instanceof Error ? error.stack : 'N/A');
    throw error;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar credenciais do Chatwoot
    const chatwootBaseUrl = Deno.env.get('CHATWOOT_BASE_URL');
    const chatwootApiKey = Deno.env.get('CHATWOOT_API_KEY');
    const chatwootAccountId = Deno.env.get('CHATWOOT_ACCOUNT_ID');

    console.log('[get-chatwoot-messages] Validando secrets...');
    console.log('[get-chatwoot-messages] BASE_URL configurada:', chatwootBaseUrl ? 'SIM' : 'NÃO');
    console.log('[get-chatwoot-messages] API_KEY configurada:', chatwootApiKey ? 'SIM (length: ' + chatwootApiKey.length + ')' : 'NÃO');
    console.log('[get-chatwoot-messages] ACCOUNT_ID configurado:', chatwootAccountId ? chatwootAccountId : 'NÃO');

    if (!chatwootBaseUrl || !chatwootApiKey || !chatwootAccountId) {
      throw new Error('Credenciais do Chatwoot não configuradas. Verifique CHATWOOT_BASE_URL, CHATWOOT_API_KEY e CHATWOOT_ACCOUNT_ID');
    }

    // Validar formato da BASE_URL (não deve ter barra final)
    if (chatwootBaseUrl.endsWith('/')) {
      throw new Error('CHATWOOT_BASE_URL não deve ter barra final. Remova a "/" no final da URL');
    }

    // Validar formato do ACCOUNT_ID (deve ser numérico)
    if (!/^\d+$/.test(chatwootAccountId)) {
      throw new Error('CHATWOOT_ACCOUNT_ID deve ser numérico. Valor atual: ' + chatwootAccountId);
    }

    // Extrair conversationId do body da requisição
    const { conversationId } = await req.json();
    console.log('[get-chatwoot-messages] Request body recebido:', { conversationId });

    if (!conversationId) {
      throw new Error('conversationId é obrigatório no body da requisição');
    }

    // Validar que conversationId é numérico
    if (typeof conversationId !== 'number' || conversationId <= 0) {
      throw new Error('conversationId deve ser um número positivo. Valor recebido: ' + conversationId);
    }

    console.log(`[get-chatwoot-messages] Buscando mensagens para conversa ${conversationId}`);
    console.log('[get-chatwoot-messages] URL completa:', `${chatwootBaseUrl}/api/v1/accounts/${chatwootAccountId}/conversations/${conversationId}/messages`);

    // Buscar mensagens da conversa
    const messages = await fetchConversationMessages(
      chatwootBaseUrl,
      chatwootApiKey,
      chatwootAccountId,
      conversationId
    );

    return new Response(
      JSON.stringify({
        success: true,
        messages,
        count: messages.length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('[get-chatwoot-messages] === ERRO NO HANDLER ===');
    console.error('[get-chatwoot-messages] Tipo:', error?.constructor?.name);
    console.error('[get-chatwoot-messages] Mensagem:', error?.message);
    console.error('[get-chatwoot-messages] Stack:', error?.stack);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro desconhecido ao buscar mensagens',
        details: {
          type: error?.constructor?.name,
          timestamp: new Date().toISOString(),
        }
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
