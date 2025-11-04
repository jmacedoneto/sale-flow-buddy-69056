/**
 * Chatwoot Service
 * 
 * Serviço responsável pela integração com a API do Chatwoot.
 * Segue os princípios de SRP (Single Responsibility Principle) e
 * separação de lógica de negócio da UI.
 */

export interface ChatwootMessage {
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

export interface ChatwootContact {
  additional_attributes: Record<string, any>;
  availability_status: string;
  email: string;
  id: number;
  name: string;
  phone_number: string;
  thumbnail: string;
  custom_attributes: Record<string, any>;
  last_activity_at: number;
  created_at: number;
}

export interface ChatwootConversation {
  id: number;
  messages: ChatwootMessage[];
  account_id: number;
  uuid: string;
  additional_attributes: Record<string, any>;
  inbox_id: number;
  labels: string[];
  status: 'open' | 'resolved' | 'pending' | 'snoozed';
  created_at: number;
  updated_at: number;
  timestamp: string;
  unread_count: number;
  last_activity_at: number;
  meta: {
    sender: ChatwootContact;
    channel: string;
    assignee?: any;
  };
}

export interface ChatwootApiResponse {
  data: {
    meta: {
      mine_count: number;
      unassigned_count: number;
      assigned_count: number;
      all_count: number;
    };
    payload: ChatwootConversation[];
  };
}

/**
 * Busca conversas do Chatwoot que possuem uma etiqueta específica.
 * 
 * @param label - A etiqueta para filtrar as conversas (ex: 'KANBAN_CRM')
 * @returns Promise com a lista de conversas que possuem a etiqueta
 * @throws Error se as credenciais do Chatwoot não estiverem configuradas
 */
export async function fetchConversationsByLabel(
  label: string = 'KANBAN_CRM'
): Promise<ChatwootConversation[]> {
  const baseUrl = import.meta.env.VITE_CHATWOOT_BASE_URL;
  const apiKey = import.meta.env.VITE_CHATWOOT_API_KEY;
  const accountId = import.meta.env.VITE_CHATWOOT_ACCOUNT_ID;

  if (!baseUrl || !apiKey || !accountId) {
    throw new Error(
      'Credenciais do Chatwoot não configuradas. Configure CHATWOOT_BASE_URL, CHATWOOT_API_KEY e CHATWOOT_ACCOUNT_ID nas configurações do projeto.'
    );
  }

  try {
    // Monta a URL da API do Chatwoot para filtrar conversas
    const url = `${baseUrl}/api/v1/accounts/${accountId}/conversations/filter`;

    // Payload para filtrar conversas por label
    const payload = {
      payload: [
        {
          attribute_key: 'labels',
          filter_operator: 'equal_to',
          values: [label],
        },
      ],
    };

    console.log(`[ChatwootService] Buscando conversas com label: ${label}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ChatwootService] Erro na API: ${response.status} - ${errorText}`);
      throw new Error(
        `Erro ao buscar conversas do Chatwoot: ${response.status} ${response.statusText}`
      );
    }

    const data: ChatwootApiResponse = await response.json();
    
    console.log(
      `[ChatwootService] ${data.data.payload.length} conversas encontradas com label '${label}'`
    );

    return data.data.payload;
  } catch (error) {
    console.error('[ChatwootService] Erro ao buscar conversas:', error);
    throw error;
  }
}

/**
 * Extrai informações resumidas de uma conversa do Chatwoot.
 * 
 * @param conversation - Conversa do Chatwoot
 * @returns Objeto com informações resumidas
 */
export function extractConversationSummary(conversation: ChatwootConversation) {
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const contactName = conversation.meta.sender.name || 'Sem nome';
  const contactEmail = conversation.meta.sender.email || '';

  return {
    id: conversation.id,
    titulo: `${contactName} - ${conversation.meta.channel}`,
    resumo: lastMessage?.content || 'Sem mensagens',
    chatwootConversaId: conversation.id,
    status: conversation.status,
    labels: conversation.labels,
    createdAt: new Date(conversation.created_at * 1000).toISOString(),
    updatedAt: new Date(conversation.updated_at * 1000).toISOString(),
    contact: {
      name: contactName,
      email: contactEmail,
      phone: conversation.meta.sender.phone_number || '',
    },
  };
}

/**
 * Busca mensagens de uma conversa específica do Chatwoot.
 * 
 * @param conversationId - ID da conversa no Chatwoot
 * @returns Promise com a lista de mensagens
 */
export async function fetchChatwootMessages(
  conversationId: number
): Promise<ChatwootMessage[]> {
  const { supabase } = await import("@/integrations/supabase/client");
  
  try {
    console.log(`[ChatwootService] Buscando mensagens da conversa: ${conversationId}`);

    const { data, error } = await supabase.functions.invoke('get-chatwoot-messages', {
      body: { conversationId },
    });

    if (error) {
      console.error('[ChatwootService] Erro ao buscar mensagens:', error);
      throw error;
    }

    if (!data.success) {
      throw new Error(data.error || 'Erro ao buscar mensagens');
    }

    console.log(`[ChatwootService] ${data.messages.length} mensagens recuperadas`);
    return data.messages;
  } catch (error) {
    console.error('[ChatwootService] Erro ao buscar mensagens:', error);
    throw error;
  }
}
