import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useChatwootIframe, ChatwootContact, ChatwootInboundMessage } from '@/hooks/useChatwootIframe';

// ========== TIPOS ==========

interface ChatwootContextData {
  conversationId: number | null;
  contact: ChatwootContact | null;
  authToken: string | null;
  isEmbedded: boolean;
  activeModal: 'kanban' | 'followup' | null;
  setActiveModal: (modal: 'kanban' | 'followup' | null) => void;
  notifyKanbanComplete: (data: { funnelId: string; stageId: string; cardId: string }) => void;
  notifyFollowUpComplete: (data: { activityId: string; scheduledDate: string }) => void;
  notifyError: (error: string) => void;
}

const ChatwootContext = createContext<ChatwootContextData | undefined>(undefined);

// ========== PROVIDER ==========

interface ChatwootProviderProps {
  children: ReactNode;
}

export const ChatwootProvider = ({ children }: ChatwootProviderProps) => {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [contact, setContact] = useState<ChatwootContact | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'kanban' | 'followup' | null>(null);

  // Handler para mensagens recebidas do Chatwoot
  const handleMessage = useCallback((message: ChatwootInboundMessage) => {
    const { type, payload } = message;

    // Atualizar dados do contexto
    if (payload.conversationId) {
      setConversationId(payload.conversationId);
    }
    if (payload.contact) {
      setContact(payload.contact);
    }
    if (payload.authToken) {
      setAuthToken(payload.authToken);
    }

    // Abrir modal baseado no tipo de mensagem
    switch (type) {
      case 'CHATWOOT_DATA':
        // Dados recebidos, aguardando ação específica
        console.log('[ChatwootContext] Dados recebidos:', payload);
        break;
      case 'OPEN_KANBAN_MODAL':
        setActiveModal('kanban');
        break;
      case 'OPEN_FOLLOWUP_MODAL':
        setActiveModal('followup');
        break;
    }
  }, []);

  const { 
    isEmbedded, 
    notifyKanbanComplete, 
    notifyFollowUpComplete, 
    notifyError 
  } = useChatwootIframe(handleMessage);

  const value: ChatwootContextData = {
    conversationId,
    contact,
    authToken,
    isEmbedded,
    activeModal,
    setActiveModal,
    notifyKanbanComplete,
    notifyFollowUpComplete,
    notifyError
  };

  return (
    <ChatwootContext.Provider value={value}>
      {children}
    </ChatwootContext.Provider>
  );
};

// ========== HOOK ==========

export const useChatwootContext = () => {
  const context = useContext(ChatwootContext);
  if (context === undefined) {
    throw new Error('useChatwootContext must be used within a ChatwootProvider');
  }
  return context;
};
