import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, Loader2, Check, FolderKanban, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFunis, useEtapas } from "@/hooks/useFunis";
import { useChatwootContext } from "@/contexts/ChatwootContext";
import { 
  getCardByConversationId, 
  createCardForConversation, 
  moveCardToStage 
} from "@/services/cardLookupService";
import { toast } from "sonner";

interface KanbanSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KanbanSelectorModal = ({ isOpen, onClose }: KanbanSelectorModalProps) => {
  const { conversationId, contact, notifyKanbanComplete, notifyError } = useChatwootContext();
  const { data: funis, isLoading: funisLoading } = useFunis();
  
  const [expandedFunilId, setExpandedFunilId] = useState<string | null>(null);
  const [existingCardId, setExistingCardId] = useState<string | null>(null);
  const [currentEtapaId, setCurrentEtapaId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingCard, setCheckingCard] = useState(true);

  // Buscar etapas do funil expandido
  const { data: etapas, isLoading: etapasLoading } = useEtapas(expandedFunilId);

  // Verificar se já existe card para a conversa
  useEffect(() => {
    const checkExistingCard = async () => {
      if (!conversationId) {
        setCheckingCard(false);
        return;
      }

      try {
        const card = await getCardByConversationId(conversationId);
        if (card) {
          setExistingCardId(card.id);
          setCurrentEtapaId(card.etapa_id);
        }
      } catch (error) {
        console.error("[KanbanModal] Erro ao verificar card:", error);
      } finally {
        setCheckingCard(false);
      }
    };

    if (isOpen) {
      setCheckingCard(true);
      checkExistingCard();
    }
  }, [conversationId, isOpen]);

  const handleSelectStage = async (funil: any, etapa: any) => {
    if (!conversationId) {
      toast.error("ID da conversa não disponível");
      notifyError("conversation_id_missing");
      return;
    }

    setIsSubmitting(true);
    try {
      let cardId = existingCardId;

      if (existingCardId) {
        // Mover card existente
        await moveCardToStage({
          cardId: existingCardId,
          etapaId: etapa.id,
          funilId: funil.id,
          funilNome: funil.nome,
          etapaNome: etapa.nome,
        });
        toast.success(`Card movido para ${funil.nome} → ${etapa.nome}`);
      } else {
        // Criar novo card
        const titulo = contact?.name || `Conversa #${conversationId}`;
        const newCard = await createCardForConversation({
          conversationId,
          titulo,
          etapaId: etapa.id,
          funilId: funil.id,
          funilNome: funil.nome,
          etapaNome: etapa.nome,
          telefone: contact?.phone,
        });
        cardId = newCard.id;
        toast.success(`Card criado em ${funil.nome} → ${etapa.nome}`);
      }

      // Notificar sucesso para o Chatwoot
      notifyKanbanComplete({
        funnelId: funil.id,
        stageId: etapa.id,
        cardId: cardId!,
      });

      onClose();
    } catch (error: any) {
      console.error("[KanbanModal] Erro:", error);
      toast.error(error.message || "Erro ao processar ação");
      notifyError(error.message || "unknown_error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFunil = (funilId: string) => {
    setExpandedFunilId(expandedFunilId === funilId ? null : funilId);
  };

  const isLoading = funisLoading || checkingCard;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            {existingCardId ? "Mover Card" : "Criar Card"}
          </DialogTitle>
        </DialogHeader>

        {/* Info do contato */}
        {contact && (
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium">{contact.name}</p>
            {contact.phone && <p className="text-muted-foreground">{contact.phone}</p>}
          </div>
        )}

        {/* Status atual */}
        {existingCardId && currentEtapaId && (
          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span>Card já existe. Selecione a nova etapa.</span>
          </div>
        )}

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {funis?.map((funil) => (
                <Collapsible
                  key={funil.id}
                  open={expandedFunilId === funil.id}
                  onOpenChange={() => handleToggleFunil(funil.id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-between hover:bg-accent",
                        expandedFunilId === funil.id && "bg-accent"
                      )}
                    >
                      <span className="font-medium">{funil.nome}</span>
                      <ChevronRight 
                        className={cn(
                          "h-4 w-4 transition-transform",
                          expandedFunilId === funil.id && "rotate-90"
                        )} 
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 pt-1">
                    {etapasLoading ? (
                      <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando etapas...
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {etapas?.map((etapa) => (
                          <Button
                            key={etapa.id}
                            variant="ghost"
                            size="sm"
                            disabled={isSubmitting || etapa.id === currentEtapaId}
                            className={cn(
                              "w-full justify-between text-left",
                              etapa.id === currentEtapaId && "bg-primary/10 text-primary"
                            )}
                            onClick={() => handleSelectStage(funil, etapa)}
                          >
                            <div className="flex items-center gap-2">
                              {etapa.cor && (
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: etapa.cor }}
                                />
                              )}
                              <span>{etapa.nome}</span>
                            </div>
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : etapa.id === currentEtapaId ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                            )}
                          </Button>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
