import { supabase } from "@/integrations/supabase/client";

/**
 * Serviço centralizado para envio de mensagens via Chatwoot.
 * Segue o princípio de separação de lógica de negócio da UI (SRP, SSOT).
 */

export interface SendMessageParams {
  conversationId: number;
  content: string;
  private?: boolean;
}

export interface SendMessageResponse {
  success: boolean;
  message_id?: number;
  error?: string;
}

/**
 * Envia uma mensagem para uma conversa do Chatwoot.
 * Usa a edge function send-chatwoot-message para validar permissões e enviar.
 */
export const sendChatwootMessage = async ({
  conversationId,
  content,
  private: isPrivate = false,
}: SendMessageParams): Promise<SendMessageResponse> => {
  try {
    console.log('[chatwootMessagingService] Enviando mensagem:', {
      conversationId,
      contentLength: content.length,
      isPrivate,
    });

    const { data, error } = await supabase.functions.invoke('send-chatwoot-message', {
      body: {
        conversation_id: conversationId,
        content,
        private: isPrivate,
      },
    });

    if (error) {
      console.error('[chatwootMessagingService] Erro ao enviar mensagem:', error);
      throw error;
    }

    console.log('[chatwootMessagingService] Mensagem enviada com sucesso:', data);
    return data as SendMessageResponse;
  } catch (error) {
    console.error('[chatwootMessagingService] Erro inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao enviar mensagem',
    };
  }
};

/**
 * Envia uma nota privada (follow-up) para uma conversa do Chatwoot.
 * Conveniente para registrar agendamentos e ações internas.
 */
export const sendFollowUpNote = async (
  conversationId: number,
  followUpText: string
): Promise<SendMessageResponse> => {
  return sendChatwootMessage({
    conversationId,
    content: followUpText,
    private: true,
  });
};
