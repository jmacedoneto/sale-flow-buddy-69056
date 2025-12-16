import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Clock, User } from "lucide-react";
import { formatDistanceToNow, differenceInDays, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

// Helper para extrair iniciais do nome
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
  avatarAgenteUrl,
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
  const [responsavel, setResponsavel] = useState<{ nome: string; avatar_url: string | null } | null>(null);
  
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
          <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          <span className="text-xs text-destructive font-medium">
            {Math.abs(diasRestantes)} {Math.abs(diasRestantes) === 1 ? 'dia vencido' : 'dias vencidos'}
          </span>
        </div>
      );
    }

    if (diasRestantes === 0) {
      return (
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
          <span className="text-xs text-warning font-medium">Hoje</span>
        </div>
      );
    }

    if (diasRestantes > 0 && diasRestantes <= 3) {
      return (
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-success" />
          <span className="text-xs text-success font-medium">
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

  // Avatar do Lead (iniciais do título)
  const leadInitials = getInitials(titulo);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 cursor-grab active:cursor-grabbing hover:shadow-lg hover:scale-[1.02] hover:border-primary/30 transition-all duration-200 bg-gradient-card border-border group relative"
      onClick={handleClick}
    >
      <div className="space-y-2">
        {/* Header com Avatar do Lead */}
        <div className="flex items-start gap-3">
          <Avatar className="h-9 w-9 shrink-0 border-2 border-primary/20">
            {avatarLeadUrl ? (
              <AvatarImage src={avatarLeadUrl} alt={titulo} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {leadInitials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
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
          </div>
        </div>
        
        {resumo && (
          <p className="text-xs text-muted-foreground line-clamp-2 pl-12">
            {resumo}
          </p>
        )}
        
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 pl-12">
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
            className="flex-1 text-success hover:bg-success/10 hover:text-success hover:border-success/30"
            onClick={(e) => handleStatusClick(e, 'ganho')}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ganho
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
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

      {/* Avatar do Responsável no canto inferior direito */}
      {responsavel && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute bottom-2 right-2">
                <Avatar className="h-6 w-6 border border-border shadow-sm">
                  {responsavel.avatar_url ? (
                    <AvatarImage src={responsavel.avatar_url} alt={responsavel.nome || 'Responsável'} />
                  ) : null}
                  <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
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