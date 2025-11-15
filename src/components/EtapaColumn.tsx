import { Badge } from "@/components/ui/badge";
import { ConversaCard } from "./ConversaCard";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { CardWithStatus } from "@/hooks/useFunis";

interface EtapaColumnProps {
  etapaId: string;
  nome: string;
  cards: CardWithStatus[];
  totalCards?: number;
  onCardClick?: (card: CardWithStatus) => void;
  onAgendarClick?: (card: CardWithStatus) => void;
  stageColor?: string; // Cor da etapa para visual moderno
  stageIndex?: number; // Índice para gradiente de cores
}

export const EtapaColumn = ({ 
  etapaId, 
  nome, 
  cards, 
  totalCards, 
  onCardClick, 
  onAgendarClick,
  stageColor,
  stageIndex = 0
}: EtapaColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: etapaId,
  });

  const cardIds = cards.map((card) => card.id);
  
  // Cores modernas por etapa (do azul ao verde)
  const defaultColors = [
    'hsl(var(--primary))',
    'hsl(217, 91%, 60%)',
    'hsl(176, 77%, 47%)',
    'hsl(142, 76%, 36%)',
    'hsl(120, 100%, 25%)',
  ];
  
  const borderColor = stageColor || defaultColors[stageIndex % defaultColors.length];

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 bg-muted/30 rounded-lg p-4 space-y-3 transition-all border-t-4 ${
        isOver ? "ring-2 ring-primary bg-muted/50 shadow-lg scale-[1.02]" : "shadow-sm hover:shadow-md"
      }`}
      style={{
        borderTopColor: borderColor,
      }}
    >
      <div className="flex items-center justify-between sticky top-0 bg-muted/30 pb-2 border-b border-border/30">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: borderColor }}></span>
          {nome}
        </h3>
        <Badge 
          variant="secondary" 
          className="text-xs font-semibold"
          style={{ 
            backgroundColor: `${borderColor}20`,
            color: borderColor,
            borderColor: borderColor
          }}
        >
          {cards.length}
          {totalCards && totalCards > cards.length && (
            <span className="ml-1 opacity-70">/ {totalCards}</span>
          )}
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
