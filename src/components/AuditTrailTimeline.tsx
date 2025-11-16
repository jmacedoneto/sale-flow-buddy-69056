import { useAuditTrail } from "@/hooks/useAuditTrail";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, User } from "lucide-react";

interface AuditTrailTimelineProps {
  cardId: string;
}

export const AuditTrailTimeline = ({ cardId }: AuditTrailTimelineProps) => {
  const { data: auditEntries, isLoading } = useAuditTrail(cardId);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando histórico...</div>;
  }

  if (!auditEntries || auditEntries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Nenhuma alteração registrada ainda
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {auditEntries.map((entry: any) => (
          <div key={entry.id} className="flex gap-3 text-sm">
            <div className="flex-shrink-0 mt-1">
              <History className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{entry.campo_label}</span>
                <span className="text-muted-foreground">alterado</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {entry.valor_anterior && (
                  <>
                    <code className="px-2 py-1 bg-muted rounded">
                      {entry.valor_anterior}
                    </code>
                    <span>→</span>
                  </>
                )}
                <code className="px-2 py-1 bg-primary/10 rounded">
                  {entry.valor_novo}
                </code>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {entry.user && (
                  <>
                    <User className="h-3 w-3" />
                    <span>{entry.user.nome || entry.user.email}</span>
                    <span>•</span>
                  </>
                )}
                <span>
                  {formatDistanceToNow(new Date(entry.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
