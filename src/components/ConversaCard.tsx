import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow, differenceInDays, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { StatusInfo } from "@/services/cardStatusService";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Pause } from "lucide-react";
import { CardStatusModal } from "./CardStatusModal";
import { useCardStatus, type CardStatus } from "@/hooks/useCardStatus";

interface ConversaCardProps {
  id: string;
  titulo: string;
  resumo?: string | null;
  chatwootConversaId?: number | null;
  createdAt: string;
  statusInfo: StatusInfo;
  funilId?: string;
  onClick?: () => void;
  onAgendarClick?: () => void;
  onFollowUpCreated?: () => void;
}

export const ConversaCard = ({
  id,
  titulo,
  resumo,
  chatwootConversaId,
  createdAt,
  statusInfo,
  funilId,
  onClick,
  onAgendarClick,
  onFollowUpCreated,
}: ConversaCardProps) => {
  const [atividadeStatus, setAtividadeStatus] = useState<{
    vencida: boolean;
    diasRestantes: number;
    dataRetorno: Date | null;
  } | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<CardStatus | null>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Buscar atividade pendente mais próxima
  useEffect(() => {
    const fetchAtividade = async () => {
      const { data } = await supabase
        .from('atividades_cards')
        .select('data_prevista, status')
        .eq('card_id', id)
        .eq('status', 'pendente')
        .order('data_prevista', { ascending: true })
        .limit(1)
        .single();

      if (data && data.data_prevista) {
        const dataRetorno = new Date(data.data_prevista);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const vencida = isPast(dataRetorno) && !isToday(dataRetorno);
        const diasRestantes = differenceInDays(dataRetorno, hoje);
        
        setAtividadeStatus({ vencida, diasRestantes, dataRetorno });
      } else {
        setAtividadeStatus(null);
      }
    };

    fetchAtividade();
  }, [id]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  const handleAgendarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAgendarClick?.();
  };

  const handleStatusClick = (e: React.MouseEvent, status: CardStatus) => {
    e.stopPropagation();
    setSelectedStatus(status);
    setStatusModalOpen(true);
  };

  const renderAtividadeBadge = () => {
    if (!atividadeStatus) return null;

    const { vencida, diasRestantes } = atividadeStatus;

    if (vencida) {
      return (
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-red-600 font-medium">
            {Math.abs(diasRestantes)} {Math.abs(diasRestantes) === 1 ? 'dia vencido' : 'dias vencidos'}
          </span>
        </div>
      );
    }

    if (diasRestantes === 0) {
      return (
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-xs text-yellow-600 font-medium">Hoje</span>
        </div>
      );
    }

    if (diasRestantes > 0 && diasRestantes <= 3) {
      return (
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs text-green-600 font-medium">
            {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}
          </span>
        </div>
      );
    }

    return null;
  };

  const renderStatusBadge = () => {
    const { status, variant, label } = statusInfo;

    if (status === 'sem') {
      return (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Badge variant={variant} className="text-xs flex items-center gap-1">
            {label}
          </Badge>
        </div>
      );
    }

    return (
      <div className="pt-2 border-t border-border">
        <Badge variant={variant} className="text-xs w-fit">
          {label}
        </Badge>
      </div>
    );
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 cursor-grab active:cursor-grabbing hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 transition-all duration-200 bg-gradient-card border-border group"
      onClick={handleClick}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {titulo}
          </h4>
          {chatwootConversaId && (
            <Badge variant="outline" className="text-xs shrink-0">
              #{chatwootConversaId}
            </Badge>
          )}
        </div>
        
        {resumo && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {resumo}
          </p>
        )}
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            <span>Conversa</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(createdAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {renderAtividadeBadge()}
            {renderStatusBadge()}
          </div>
        </div>

        {/* Botões de Status */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-green-600 hover:bg-green-50 hover:text-green-700"
            onClick={(e) => handleStatusClick(e, 'ganho')}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ganho
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={(e) => handleStatusClick(e, 'perdido')}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Perdido
          </Button>
        </div>

        {selectedStatus && (
          <CardStatusModal
            isOpen={statusModalOpen}
            onClose={() => {
              setStatusModalOpen(false);
              setSelectedStatus(null);
            }}
            cardId={id}
            funilId={funilId}
            status={selectedStatus}
          />
        )}
      </div>
    </Card>
  );
};
