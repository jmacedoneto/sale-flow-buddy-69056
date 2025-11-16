import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { StatusInfo } from "@/services/cardStatusService";
import { FollowUpInline } from "./FollowUpInline";
import { useState } from "react";

interface ConversaCardProps {
  id: string;
  titulo: string;
  resumo?: string | null;
  chatwootConversaId?: number | null;
  createdAt: string;
  statusInfo: StatusInfo;
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
  onClick,
  onAgendarClick,
  onFollowUpCreated,
}: ConversaCardProps) => {
  const [showFollowUp, setShowFollowUp] = useState(false);
  
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  const handleAgendarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAgendarClick?.();
  };

  const renderStatusBadge = () => {
    const { status, variant, label } = statusInfo;

    if (status === 'sem') {
      return (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Badge variant={variant} className="text-xs flex items-center gap-1">
            {label}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs" 
            onClick={handleAgendarClick}
          >
            Agendar
          </Button>
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

        {renderStatusBadge()}
        
        <div className="pt-2">
          {showFollowUp ? (
            <FollowUpInline 
              cardId={id} 
              onSuccess={() => {
                setShowFollowUp(false);
                onFollowUpCreated?.();
              }}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowFollowUp(true);
              }}
              className="w-full text-xs"
            >
              + Criar Follow-up
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
