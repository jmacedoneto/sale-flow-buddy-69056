import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Copy, ExternalLink, GripVertical } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import { toast } from "sonner";
import { AtividadeDetailsModal } from "./AtividadeDetailsModal";
import { useNavigate } from "react-router-dom";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface AtividadesAdminKanbanProps {
  searchTerm: string;
  mostrarConcluidas: boolean;
  userId?: string;
}

const statusColumns = [
  { id: 'pendente', label: 'Demanda Aberta', bgColor: 'bg-destructive/5', headerBg: 'bg-destructive', borderColor: 'border-destructive/30' },
  { id: 'em_andamento', label: 'Em Resolução', bgColor: 'bg-warning/5', headerBg: 'bg-warning', borderColor: 'border-warning/30' },
  { id: 'concluida', label: 'Concluído', bgColor: 'bg-success/5', headerBg: 'bg-success', borderColor: 'border-success/30' },
];

const DroppableColumn = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div 
      ref={setNodeRef} 
      className={`min-h-[300px] p-3 rounded-b-xl transition-all duration-200 ${
        isOver ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-muted/20'
      }`}
    >
      {children}
    </div>
  );
};

const DraggableCard = ({ atividade, onClick, onCopyPhone }: { 
  atividade: any; 
  onClick: () => void;
  onCopyPhone: (phone: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: atividade.id });
  const navigate = useNavigate();
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  } : undefined;

  const telefone = atividade.cards_conversas?.telefone_lead;
  const leadInitials = atividade.cards_conversas?.titulo 
    ? atividade.cards_conversas.titulo.substring(0, 2).toUpperCase() 
    : "??";

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className="mb-3 hover:shadow-lg transition-all duration-200 bg-card/80 backdrop-blur-sm border-border/50 rounded-xl overflow-hidden"
    >
      {/* Drag Handle */}
      <div 
        {...listeners} 
        {...attributes} 
        className="h-5 bg-muted/50 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-muted border-b border-border/30"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/50" />
      </div>

      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Header com Avatar */}
          <div className="flex items-start gap-3 cursor-pointer" onClick={onClick}>
            <Avatar className="h-9 w-9 shrink-0 border-2 border-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-semibold">
                {leadInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm line-clamp-1 hover:text-primary transition-colors">
                {atividade.cards_conversas?.titulo || 'Atividade avulsa'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {atividade.descricao}
              </p>
            </div>
          </div>
          
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">
              {atividade.tipo}
            </Badge>
            {atividade.data_prevista && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(atividade.data_prevista), "dd/MM", { locale: ptBR })}
              </span>
            )}
            {!atividade.card_id && (
              <Badge variant="outline" className="text-[10px] text-warning border-warning/30">
                Avulsa
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 pt-2 border-t border-border/30">
            {telefone && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs" 
                onClick={(e) => { e.stopPropagation(); onCopyPhone(telefone); }}
              >
                <Copy className="h-3 w-3 mr-1" />{telefone}
              </Button>
            )}
            {atividade.card_id && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs" 
                onClick={(e) => { e.stopPropagation(); navigate(`/dashboard?cardId=${atividade.card_id}`); }}
              >
                <ExternalLink className="h-3 w-3 mr-1" />Ver Card
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const AtividadesAdminKanban = ({ searchTerm, mostrarConcluidas, userId }: AtividadesAdminKanbanProps) => {
  const [selectedAtividade, setSelectedAtividade] = useState<any | null>(null);
  const queryClient = useQueryClient();

  // Sensor com distance constraint para evitar conflitos com cliques
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );
  
  const { data: atividades = [], isLoading, refetch } = useQuery({
    queryKey: ['atividades-admin', mostrarConcluidas, searchTerm, userId],
    queryFn: async () => {
      let query = supabase
        .from('atividades_cards')
        .select(`*, cards_conversas(id, titulo, telefone_lead, chatwoot_conversa_id, funil_nome)`)
        .order('data_prevista', { ascending: true });

      if (!mostrarConcluidas) query = query.neq('status', 'concluida');
      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      if (error) throw error;
      
      if (searchTerm) {
        return data.filter(a => 
          a.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.cards_conversas?.titulo?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return data;
    },
  });

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success("Telefone copiado!");
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const atividadeId = active.id as string;
    const newStatus = over.id as string;
    
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'concluida') updateData.data_conclusao = new Date().toISOString();

      const { error } = await supabase.from('atividades_cards').update(updateData).eq('id', atividadeId);
      if (error) throw error;
      
      toast.success(`Atividade movida para ${statusColumns.find(c => c.id === newStatus)?.label}`);
      queryClient.invalidateQueries({ queryKey: ['atividades-admin'] });
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const getAtividadesByStatus = (status: string) => {
    return atividades.filter(a => status === 'pendente' ? (a.status === 'pendente' || !a.status) : a.status === status);
  };

  if (isLoading) return <div className="p-4">Carregando...</div>;

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          {statusColumns.map((column) => {
            const columnAtividades = getAtividadesByStatus(column.id);
            return (
              <div key={column.id} className={`rounded-xl border-2 ${column.borderColor} ${column.bgColor} overflow-hidden`}>
                <div className={`p-3 ${column.headerBg}`}>
                  <h3 className="font-semibold text-white flex items-center justify-between">
                    {column.label}
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {columnAtividades.length}
                    </Badge>
                  </h3>
                </div>
                <DroppableColumn id={column.id}>
                  {columnAtividades.map((atividade) => (
                    <DraggableCard 
                      key={atividade.id} 
                      atividade={atividade} 
                      onClick={() => setSelectedAtividade(atividade)} 
                      onCopyPhone={handleCopyPhone} 
                    />
                  ))}
                  {columnAtividades.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border/50 rounded-lg">
                      Nenhuma atividade
                    </p>
                  )}
                </DroppableColumn>
              </div>
            );
          })}
        </div>
      </DndContext>

      {selectedAtividade && (
        <AtividadeDetailsModal 
          isOpen={!!selectedAtividade} 
          onClose={() => setSelectedAtividade(null)} 
          atividade={selectedAtividade} 
          onSuccess={() => { refetch(); setSelectedAtividade(null); }} 
        />
      )}
    </>
  );
};
