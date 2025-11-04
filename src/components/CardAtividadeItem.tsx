import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, AlertCircle, Clock, CheckCircle } from "lucide-react";
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
}

export const CardAtividadeItem = ({ card, isVencido = false }: CardAtividadeItemProps) => {
  const prazoDate = card.prazo ? new Date(card.prazo) : null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const diasRestantes = prazoDate ? differenceInDays(prazoDate, hoje) : null;
  const updateCard = useUpdateCard();

  const getPrioridadeColor = (prioridade: string | null) => {
    switch (prioridade) {
      case 'urgente':
        return 'bg-destructive text-destructive-foreground';
      case 'alta':
        return 'bg-orange-500 text-white';
      case 'media':
        return 'bg-warning text-warning-foreground';
      case 'baixa':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
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

  return (
    <Link 
      to={`/dashboard?cardId=${card.id}`}
      className="block"
    >
      <Card className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        isVencido && "border-destructive/50"
      )}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header com título e badge de prioridade */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1 truncate">
                  {card.titulo}
                </h3>
                {card.resumo && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {card.resumo}
                  </p>
                )}
              </div>

              {card.prioridade && (
                <Badge 
                  className={cn("text-xs shrink-0", getPrioridadeColor(card.prioridade))}
                >
                  {card.prioridade.charAt(0).toUpperCase() + card.prioridade.slice(1)}
                </Badge>
              )}
            </div>
            
            {/* Footer com data e dias */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                {prazoDate && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs",
                    isVencido ? "text-destructive" : "text-muted-foreground"
                  )}>
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(prazoDate, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}

                {diasRestantes !== null && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    isVencido ? "text-destructive" : diasRestantes <= 3 ? "text-warning" : "text-primary"
                  )}>
                    {isVencido ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                    <span>{getDiasLabel()}</span>
                  </div>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleMarcarConcluido}
                disabled={updateCard.isPending}
                className="gap-2 shrink-0"
              >
                <CheckCircle className="h-3 w-3" />
                Concluir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
