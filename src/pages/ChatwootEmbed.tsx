import { useEffect } from "react";
import { ChatwootProvider, useChatwootContext } from "@/contexts/ChatwootContext";
import { KanbanSelectorModal } from "@/components/chatwoot/KanbanSelectorModal";
import { FollowUpModal } from "@/components/chatwoot/FollowUpModal";
import { Loader2, FolderKanban, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// QueryClient local para a página embed
const queryClient = new QueryClient();

const EmbedContent = () => {
  const { 
    conversationId, 
    contact, 
    activeModal, 
    setActiveModal,
    isEmbedded 
  } = useChatwootContext();

  // Log para debug
  useEffect(() => {
    console.log("[ChatwootEmbed] Montado", { isEmbedded, conversationId, contact });
  }, [isEmbedded, conversationId, contact]);

  // Se não recebeu dados ainda, mostrar modo de espera
  if (!conversationId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <h2 className="text-lg font-semibold">Aguardando dados do Chatwoot...</h2>
          <p className="text-sm text-muted-foreground">
            Este aplicativo precisa ser aberto a partir do Chatwoot para funcionar.
          </p>
        </div>
      </div>
    );
  }

  // Mostrar opções quando tem conversationId
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header com info do contato */}
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">CRM Integração</h1>
          {contact && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{contact.name}</p>
              {contact.phone && <p className="text-sm text-muted-foreground">{contact.phone}</p>}
              {contact.email && <p className="text-sm text-muted-foreground">{contact.email}</p>}
            </div>
          )}
          <p className="text-sm text-muted-foreground">Conversa #{conversationId}</p>
        </div>

        {/* Ações disponíveis */}
        <div className="grid gap-4">
          <Button
            size="lg"
            className="h-20 text-lg"
            onClick={() => setActiveModal('kanban')}
          >
            <FolderKanban className="h-6 w-6 mr-3" />
            Gerenciar no Kanban
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-20 text-lg"
            onClick={() => setActiveModal('followup')}
          >
            <Clock className="h-6 w-6 mr-3" />
            Agendar Follow-up
          </Button>
        </div>
      </div>

      {/* Modais */}
      <KanbanSelectorModal
        isOpen={activeModal === 'kanban'}
        onClose={() => setActiveModal(null)}
      />
      <FollowUpModal
        isOpen={activeModal === 'followup'}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
};

// Página wrapper com providers necessários
const ChatwootEmbed = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatwootProvider>
        <EmbedContent />
      </ChatwootProvider>
    </QueryClientProvider>
  );
};

export default ChatwootEmbed;
