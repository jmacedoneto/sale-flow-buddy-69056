import { Clock, MessageSquare, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AtividadeCard } from "@/types/database";

interface AtividadeTimelineProps {
  atividades: AtividadeCard[];
}

export const AtividadeTimeline = ({ atividades }: AtividadeTimelineProps) => {
  const getIcon = (tipo: string) => {
    switch (tipo) {
      case "NOTA":
        return <MessageSquare className="h-4 w-4" />;
      case "MUDANCA_ETAPA":
        return <ArrowRight className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "NOTA":
        return "Nota";
      case "MUDANCA_ETAPA":
        return "Mudança de Etapa";
      default:
        return tipo;
    }
  };

  if (atividades.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma atividade registrada
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {atividades.map((atividade) => (
        <div key={atividade.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              {getIcon(atividade.tipo)}
            </div>
            {atividades[atividades.length - 1].id !== atividade.id && (
              <div className="w-px h-full bg-border mt-2" />
            )}
          </div>
          
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-foreground">
                {getTipoLabel(atividade.tipo)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(atividade.data_criacao), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {atividade.descricao}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
