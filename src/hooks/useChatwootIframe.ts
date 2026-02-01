import { useEffect, useCallback, useRef } from 'react';

// ========== TIPOS DE MENSAGENS ==========

export interface ChatwootContact {
  name: string;
  phone?: string;
  email?: string;
}

export interface ChatwootInboundMessage {
  type: 'CHATWOOT_DATA' | 'OPEN_KANBAN_MODAL' | 'OPEN_FOLLOWUP_MODAL';
  payload: {
    conversationId: number;
    contact?: ChatwootContact;
    authToken?: string;
  };
}

export interface ChatwootOutboundMessage {
  type: 'KANBAN_ACTION_COMPLETE' | 'FOLLOWUP_ACTION_COMPLETE' | 'CRM_ERROR' | 'CRM_READY';
  success: boolean;
  data?: {
    funnelId?: string;
    stageId?: string;
    cardId?: string;
    activityId?: string;
    scheduledDate?: string;
  };
  error?: string;
}

export type ChatwootMessageHandler = (message: ChatwootInboundMessage) => void;

// ========== HOOK ==========

export const useChatwootIframe = (onMessage?: ChatwootMessageHandler) => {
  const isEmbeddedRef = useRef<boolean>(false);
  
  // Detectar se está em iframe
  useEffect(() => {
    try {
      isEmbeddedRef.current = window.self !== window.top;
    } catch (e) {
      isEmbeddedRef.current = true; // Cross-origin, assume embedded
    }
  }, []);

  // Listener de mensagens
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validação básica do payload
      if (!event.data || typeof event.data !== 'object') return;
      if (!event.data.type || !event.data.payload) return;

      const validTypes = ['CHATWOOT_DATA', 'OPEN_KANBAN_MODAL', 'OPEN_FOLLOWUP_MODAL'];
      if (!validTypes.includes(event.data.type)) return;

      console.log('[ChatwootIframe] Mensagem recebida:', event.data.type, event.data.payload);

      if (onMessage) {
        onMessage(event.data as ChatwootInboundMessage);
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notificar parent que o CRM está pronto
    sendMessage({ type: 'CRM_READY', success: true });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onMessage]);

  // Enviar mensagem para o parent (Chatwoot)
  const sendMessage = useCallback((message: ChatwootOutboundMessage) => {
    if (isEmbeddedRef.current || window.parent !== window) {
      console.log('[ChatwootIframe] Enviando mensagem:', message);
      window.parent.postMessage(message, '*');
    }
  }, []);

  // Notificar sucesso na ação do Kanban
  const notifyKanbanComplete = useCallback((data: {
    funnelId: string;
    stageId: string;
    cardId: string;
  }) => {
    sendMessage({
      type: 'KANBAN_ACTION_COMPLETE',
      success: true,
      data
    });
  }, [sendMessage]);

  // Notificar sucesso no Follow-up
  const notifyFollowUpComplete = useCallback((data: {
    activityId: string;
    scheduledDate: string;
  }) => {
    sendMessage({
      type: 'FOLLOWUP_ACTION_COMPLETE',
      success: true,
      data
    });
  }, [sendMessage]);

  // Notificar erro
  const notifyError = useCallback((error: string) => {
    sendMessage({
      type: 'CRM_ERROR',
      success: false,
      error
    });
  }, [sendMessage]);

  return {
    isEmbedded: isEmbeddedRef.current,
    sendMessage,
    notifyKanbanComplete,
    notifyFollowUpComplete,
    notifyError
  };
};
