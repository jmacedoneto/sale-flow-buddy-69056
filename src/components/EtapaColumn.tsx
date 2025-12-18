import { Badge } from "@/components/ui/badge";
import { ConversaCard } from "./ConversaCard";
import { useDroppable } from "@dnd-kit/core";
import type { CardWithStatus } from "@/hooks/useFunis";

interface EtapaColumnProps {
  etapaId: string;
  nome: string;
  cards: CardWithStatus[];
  totalCards?: number;
  totalValor?: number;
  onCardClick?: (card: CardWithStatus) => void;
  onAgendarClick?: (card: CardWithStatus) => void;
  stageColor?: string;
  stageIndex?: number;
}

export const EtapaColumn = ({ 
  etapaId, 
  nome, 
  cards, 
  totalCards,
  totalValor = 0,
  onCardClick, 
  onAgendarClick,
  stageColor,
  stageIndex = 0
}: EtapaColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: etapaId,
  });
  
  // Cores modernas por etapa
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
      className={`flex-shrink-0 w-80 rounded-2xl p-4 space-y-3 transition-all duration-300 
        bg-card/40 backdrop-blur-sm border border-border/50
        ${isOver 
          ? "ring-2 ring-primary/50 bg-primary/5 shadow-xl scale-[1.02]" 
          : "shadow-sm hover:shadow-lg hover:bg-card/60"
        }`}
      style={{
        borderTopWidth: '3px',
        borderTopColor: borderColor,
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sticky top-0 pb-3 border-b border-border/30">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <span 
              className="w-2.5 h-2.5 rounded-full shadow-sm" 
              style={{ backgroundColor: borderColor }}
            />
            {nome}
          </h3>
          <Badge 
            variant="secondary" 
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{ 
              backgroundColor: `${borderColor}15`,
              color: borderColor,
              borderColor: `${borderColor}30`,
              borderWidth: '1px'
            }}
          >
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            }).format(totalValor || 0)}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{cards.length} card{cards.length !== 1 ? 's' : ''}</span>
          {totalCards && totalCards > cards.length && (
            <span className="opacity-60">/ {totalCards} total</span>
          )}
        </div>
      </div>
      
      {/* Cards List */}
      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {cards.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm rounded-xl border border-dashed border-border/50 bg-muted/20">
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
              funilId={card.funil_id || undefined}
              assignedTo={(card as any).assigned_to}
              avatarLeadUrl={(card as any).avatar_lead_url}
              leadScore={(card as any).lead_score}
              leadScoreCategoria={(card as any).lead_score_categoria}
              onClick={() => onCardClick?.(card)}
              onAgendarClick={() => onAgendarClick?.(card)}
            />
          ))
        )}
      </div>
    </div>
  );
};
