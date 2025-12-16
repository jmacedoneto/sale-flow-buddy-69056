import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, AlertCircle, Clock, CheckCircle, GripVertical } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUpdateCard } from "@/hooks/useFunis";
import { toast } from "sonner";
import type { CardConversa } from "@/types/database";

interface CardAtividadeItemProps {
  card: CardConversa;
  isVencido?: boolean;
  isDraggable?: boolean;
}

const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const CardAtividadeItem = ({ card, isVencido = false, isDraggable = false }: CardAtividadeItemProps) => {
  const prazoDate = card.prazo ? new Date(card.prazo) : null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const diasRestantes = prazoDate ? differenceInDays(prazoDate, hoje) : null;
  const updateCard = useUpdateCard();

  const getPrioridadeVariant = (prioridade: string | null) => {
    switch (prioridade) {
      case 'urgente':
        return 'destructive';
      case 'alta':
        return 'default';
      case 'media':
        return 'secondary';
      case 'baixa':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getDiasLabel = () => {
    if (diasRestantes === null) return '';
    
    if (diasRestantes === 0) return 'Vence hoje';
    if (diasRestantes === 1) return 'Vence em 1 dia';
    if (diasRestantes > 1) return `Vence em ${diasRestantes} dias`;
    if (diasRestantes === -1) return 'Atrasado há 1 dia';
    return `Atrasado há ${Math.abs(diasRestantes)} dias`;
  };

  const handleMarcarConcluido = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    updateCard.mutate(
      { id: card.id, updates: { prazo: null } },
      {
        onSuccess: () => {
          toast.success("Card marcado como concluído!");
        },
      }
    );
  };

  const leadInitials = getInitials(card.titulo);

  return (
    <Link 
      to={`/dashboard?cardId=${card.id}`}
      className="block"
    >
      <Card className={cn(
        "p-0 hover:shadow-xl hover:scale-[1.02] hover:border-primary/30",
        "transition-all duration-200",
        "bg-card/80 backdrop-blur-sm border-border/50",
        "group relative rounded-xl overflow-hidden",
        isVencido && "border-destructive/50"
      )}>
        {/* Drag Handle */}
        {isDraggable && (
          <div 
            data-drag-handle
            className="h-6 bg-muted/50 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-muted border-b border-border/30"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
          </div>
        )}

        <div className="p-4 space-y-3">
          {/* Header com Avatar */}
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0 border-2 border-primary/20 shadow-sm">
              {card.avatar_lead_url ? (
                <AvatarImage src={card.avatar_lead_url} alt={card.titulo} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-semibold">
                {leadInitials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {card.titulo}
                </h4>
                {card.prioridade && (
                  <Badge 
                    variant={getPrioridadeVariant(card.prioridade) as any}
                    className="text-[10px] shrink-0"
                  >
                    {card.prioridade.charAt(0).toUpperCase() + card.prioridade.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {card.resumo && (
            <p className="text-xs text-muted-foreground line-clamp-2 pl-[52px]">
              {card.resumo}
            </p>
          )}
          
          {/* Footer com data e dias */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-3 flex-wrap">
              {prazoDate && (
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full",
                  isVencido ? "bg-destructive/10" : "bg-muted/50"
                )}>
                  <Clock className={cn(
                    "h-3 w-3",
                    isVencido ? "text-destructive" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-[10px] font-medium",
                    isVencido ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {format(prazoDate, "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}

              {diasRestantes !== null && (
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full",
                  isVencido ? "bg-destructive/10" : diasRestantes <= 3 ? "bg-warning/10" : "bg-success/10"
                )}>
                  {isVencido ? (
                    <AlertCircle className="h-3 w-3 text-destructive" />
                  ) : (
                    <Calendar className={cn(
                      "h-3 w-3",
                      diasRestantes <= 3 ? "text-warning" : "text-success"
                    )} />
                  )}
                  <span className={cn(
                    "text-[10px] font-medium",
                    isVencido ? "text-destructive" : diasRestantes <= 3 ? "text-warning" : "text-success"
                  )}>
                    {getDiasLabel()}
                  </span>
                </div>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleMarcarConcluido}
              disabled={updateCard.isPending}
              className="gap-1.5 h-7 text-xs text-success hover:bg-success/10 hover:text-success hover:border-success/30 rounded-lg"
            >
              <CheckCircle className="h-3 w-3" />
              Concluir
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
};
