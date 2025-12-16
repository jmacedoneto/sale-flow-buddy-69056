import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow, differenceInDays, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDraggable } from "@dnd-kit/core";
import type { StatusInfo } from "@/services/cardStatusService";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { CardStatusModal } from "./CardStatusModal";
import { useCardStatus, type CardStatus } from "@/hooks/useCardStatus";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ConversaCardProps {
  id: string;
  titulo: string;
  resumo?: string | null;
  chatwootConversaId?: number | null;
  createdAt: string;
  statusInfo: StatusInfo;
  funilId?: string;
  assignedTo?: string | null;
  avatarLeadUrl?: string | null;
  avatarAgenteUrl?: string | null;
  onClick?: () => void;
  onAgendarClick?: () => void;
  onFollowUpCreated?: () => void;
}

const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const ConversaCard = ({
  id,
  titulo,
  resumo,
  chatwootConversaId,
  createdAt,
  statusInfo,
  funilId,
  assignedTo,
  avatarLeadUrl,
  onClick,
}: ConversaCardProps) => {
  const [atividadeStatus, setAtividadeStatus] = useState<{
    vencida: boolean;
    diasRestantes: number;
    dataRetorno: Date | null;
  } | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<CardStatus | null>(null);
  const [responsavel, setResponsavel] = useState<{ nome: string; avatar_url: string | null } | null>(null);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: 0.8,
    zIndex: 50,
  } : { opacity: isDragging ? 0.5 : 1 };

  // Buscar dados do responsável
  useEffect(() => {
    const fetchResponsavel = async () => {
      if (!assignedTo) {
        setResponsavel(null);
        return;
      }

      const { data } = await supabase
        .from('users_crm')
        .select('nome, avatar_url')
        .eq('id', assignedTo)
        .single();

      if (data) {
        setResponsavel(data);
      }
    };

    fetchResponsavel();
  }, [assignedTo]);

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
    // Não propagar se clicou em botão ou drag handle
    if ((e.target as HTMLElement).closest('button') || 
        (e.target as HTMLElement).closest('[data-drag-handle]')) {
      return;
    }
    onClick?.();
  };

  const handleStatusClick = (e: React.MouseEvent, status: CardStatus) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedStatus(status);
    setStatusModalOpen(true);
  };

  const renderAtividadeBadge = () => {
    if (!atividadeStatus) return null;

    const { vencida, diasRestantes } = atividadeStatus;

    if (vencida) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/10">
          <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
          <span className="text-[10px] text-destructive font-medium">
            {Math.abs(diasRestantes)}d vencido
          </span>
        </div>
      );
    }

    if (diasRestantes === 0) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-warning/10">
          <div className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
          <span className="text-[10px] text-warning font-medium">Hoje</span>
        </div>
      );
    }

    if (diasRestantes > 0 && diasRestantes <= 3) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10">
          <div className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="text-[10px] text-success font-medium">
            {diasRestantes}d
          </span>
        </div>
      );
    }

    return null;
  };

  const renderStatusBadge = () => {
    const { variant, label } = statusInfo;

    return (
      <Badge variant={variant} className="text-[10px] px-2 py-0.5 font-medium">
        {label}
      </Badge>
    );
  };

  const leadInitials = getInitials(titulo);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-0
        hover:shadow-xl hover:scale-[1.02] hover:border-primary/30 
        transition-all duration-200 
        bg-card/95 dark:bg-slate-100/95 dark:text-slate-900 backdrop-blur-sm border-border/50 
        group relative rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
      onClick={handleClick}
    >
      {/* Indicador visual de drag no topo */}
      <div 
        className="h-2 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"
      />

      <div className="p-4 space-y-3">
        {/* Header com Avatar do Lead */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0 border-2 border-primary/20 shadow-sm">
            {avatarLeadUrl ? (
              <AvatarImage src={avatarLeadUrl} alt={titulo} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-semibold">
              {leadInitials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors cursor-pointer">
                {titulo}
              </h4>
              {chatwootConversaId && (
                <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                  #{chatwootConversaId}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {resumo && (
          <p className="text-xs text-muted-foreground line-clamp-2 pl-[52px]">
            {resumo}
          </p>
        )}
        
        {/* Meta info */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground pl-[52px]">
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

        {/* Status Row */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            {renderAtividadeBadge()}
            {renderStatusBadge()}
          </div>
        </div>

        {/* Action Buttons - Separados do drag */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs text-success hover:bg-success/10 hover:text-success hover:border-success/30 rounded-lg"
            onClick={(e) => handleStatusClick(e, 'ganho')}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Ganho
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 rounded-lg"
            onClick={(e) => handleStatusClick(e, 'perdido')}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
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

      {/* Avatar do Responsável */}
      {responsavel && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute bottom-3 right-3">
                <Avatar className="h-6 w-6 border border-border shadow-sm">
                  {responsavel.avatar_url ? (
                    <AvatarImage src={responsavel.avatar_url} alt={responsavel.nome || 'Responsável'} />
                  ) : null}
                  <AvatarFallback className="bg-muted text-muted-foreground text-[9px]">
                    {getInitials(responsavel.nome || '')}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">{responsavel.nome || 'Responsável'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </Card>
  );
};
