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

    const data = await response.json();
    console.log(`[get-chatwoot-messages] === SUCESSO ===`);
    console.log(`[get-chatwoot-messages] Tipo de resposta:`, typeof data);
    console.log(`[get-chatwoot-messages] Keys:`, Object.keys(data));
    
    // A API do Chatwoot retorna { meta: {...}, payload: [...] }
    // As mensagens estão em data.payload
    const messages: ChatwootMessage[] = Array.isArray(data.payload) ? data.payload : 
                                        Array.isArray(data) ? data : [];
    
    console.log(`[get-chatwoot-messages] ${messages.length} mensagens encontradas`);
    
    if (messages.length > 0) {
      console.log(`[get-chatwoot-messages] Primeira mensagem:`, JSON.stringify(messages[0], null, 2));
    }

    return messages;
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
    console.log('[get-chatwoot-messages] Iniciando busca de mensagens...');

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configuração do Chatwoot da tabela integracao_chatwoot
    const { data: config, error: configError } = await supabase
      .from('integracao_chatwoot')
      .select('*')
      .eq('status', 'ativo')
      .maybeSingle();

    if (configError || !config) {
      console.error('[get-chatwoot-messages] Erro ao buscar config:', configError);
      throw new Error('Chatwoot não configurado ou inativo');
    }

    console.log('[get-chatwoot-messages] Config encontrada:', {
      url: config.url,
      accountId: config.account_id,
      hasApiKey: !!config.api_key,
    });

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

    // Buscar mensagens da conversa
    const messages = await fetchConversationMessages(
      config.url,
      config.api_key,
      config.account_id.toString(),
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
