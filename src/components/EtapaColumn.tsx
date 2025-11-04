import { Badge } from "@/components/ui/badge";
import { ConversaCard } from "./ConversaCard";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { CardWithStatus } from "@/hooks/useFunis";

interface EtapaColumnProps {
  etapaId: string;
  nome: string;
  cards: CardWithStatus[];
  onCardClick?: (card: CardWithStatus) => void;
  onAgendarClick?: (card: CardWithStatus) => void;
}

export const EtapaColumn = ({ etapaId, nome, cards, onCardClick, onAgendarClick }: EtapaColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: etapaId,
  });

  const cardIds = cards.map((card) => card.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 bg-muted/30 rounded-lg p-4 space-y-3 transition-colors ${
        isOver ? "ring-2 ring-primary bg-muted/50" : ""
      }`}
    >
      <div className="flex items-center justify-between sticky top-0 bg-muted/30 pb-2">
        <h3 className="font-semibold text-foreground">{nome}</h3>
        <Badge variant="secondary" className="text-xs">
          {cards.length}
        </Badge>
      </div>
      
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 scrollbar-thin">
          {cards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum card nesta etapa
            </div>
          ) : (
            cards.map((card) => (
              <ConversaCard
                key={card.id}
                id={card.id}
                titulo={card.titulo || 'Sem título'}
                resumo={card.resumo}
                chatwootConversaId={card.chatwoot_conversa_id || undefined}
                createdAt={card.created_at || new Date().toISOString()}
                statusInfo={card.statusInfo}
                onClick={() => onCardClick?.(card)}
                onAgendarClick={() => onAgendarClick?.(card)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
};
