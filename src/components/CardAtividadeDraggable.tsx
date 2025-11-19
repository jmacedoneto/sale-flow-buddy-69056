import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, MessageSquare, Calendar, FileText, CheckCircle } from "lucide-react";

interface CardAtividadeDraggableProps {
  atividade: any;
  onClick: (atividade: any) => void;
}

const getActivityIcon = (tipo: string) => {
  switch (tipo) {
    case 'ligacao':
      return <Phone className="h-4 w-4 text-blue-500" />;
    case 'mensagem':
      return <MessageSquare className="h-4 w-4 text-green-500" />;
    case 'reuniao':
      return <Calendar className="h-4 w-4 text-purple-500" />;
    case 'tarefa':
      return <FileText className="h-4 w-4 text-orange-500" />;
    case 'follow-up':
      return <CheckCircle className="h-4 w-4 text-teal-500" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

/**
 * Componente de atividade com drag-and-drop usando @dnd-kit
 */
export const CardAtividadeDraggable = ({ atividade, onClick }: CardAtividadeDraggableProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: atividade.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const dataPrevista = atividade.data_prevista ? new Date(atividade.data_prevista) : null;
  const diasDiferenca = dataPrevista ? differenceInDays(dataPrevista, hoje) : 0;
  const isVencida = diasDiferenca < 0;
  const cor = isVencida ? "border-red-500" : diasDiferenca === 0 ? "border-yellow-500" : "border-green-500";

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={`mb-3 cursor-pointer hover:shadow-md transition-shadow ${cor} border-l-4`}
        onClick={() => onClick(atividade)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <div className="mt-1">{getActivityIcon(atividade.tipo)}</div>
            <div className="flex-1">
              <p className="font-medium text-sm">{atividade.cards_conversas?.titulo || 'Sem título'}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{atividade.descricao}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs bg-secondary px-2 py-1 rounded">{atividade.tipo}</span>
                {atividade.data_prevista && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(atividade.data_prevista), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                )}
                {isVencida && (
                  <span className="text-xs text-red-600 font-medium">
                    Vencida há {Math.abs(diasDiferenca)} dia(s)
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
