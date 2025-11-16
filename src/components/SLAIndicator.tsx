import { AlertCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SLAIndicatorProps {
  slaVencimento: string | null;
  dataRetorno?: string | null;
  className?: string;
}

export const SLAIndicator = ({ slaVencimento, dataRetorno, className }: SLAIndicatorProps) => {
  if (!slaVencimento && !dataRetorno) return null;

  const targetDate = slaVencimento || dataRetorno;
  if (!targetDate) return null;

  const now = new Date();
  const target = new Date(targetDate);
  const isOverdue = target < now;
  const hoursRemaining = (target.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isUrgent = hoursRemaining < 24 && hoursRemaining > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium",
        isOverdue && "bg-destructive/10 text-destructive",
        isUrgent && "bg-warning/10 text-warning",
        !isOverdue && !isUrgent && "bg-muted text-muted-foreground",
        className
      )}
    >
      {isOverdue ? (
        <AlertCircle className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      <span>
        {isOverdue ? "Atrasado" : "Vence"}{" "}
        {formatDistanceToNow(target, {
          addSuffix: true,
          locale: ptBR,
        })}
      </span>
    </div>
  );
};
