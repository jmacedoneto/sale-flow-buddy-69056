import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DndContext, closestCenter, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { toast } from "sonner";
import { AtividadeDetailsModal } from "./AtividadeDetailsModal";
import { useNavigate } from "react-router-dom";

interface AtividadesAdminKanbanProps {
  searchTerm: string;
  mostrarConcluidas: boolean;
  userId?: string;
}

const statusColumns = [
  { id: 'pendente', label: 'Demanda Aberta', bgColor: 'bg-red-50 dark:bg-red-950/30', headerBg: 'bg-red-500', borderColor: 'border-red-300' },
  { id: 'em_andamento', label: 'Em Resolução', bgColor: 'bg-yellow-50 dark:bg-yellow-950/30', headerBg: 'bg-yellow-500', borderColor: 'border-yellow-300' },
  { id: 'concluida', label: 'Concluído', bgColor: 'bg-green-50 dark:bg-green-950/30', headerBg: 'bg-green-500', borderColor: 'border-green-300' },
];

const DroppableColumn = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div 
      ref={setNodeRef} 
      className={`min-h-[300px] p-2 rounded-b-lg transition-colors ${isOver ? 'bg-primary/10' : 'bg-muted/30'}`}
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

  return (
    <Card ref={setNodeRef} style={style} className="mb-3 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Drag handle */}
        <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing mb-2 p-1 -m-1 rounded hover:bg-muted">
          <div className="h-1 w-8 mx-auto bg-muted-foreground/30 rounded" />
        </div>
        
        <div className="flex flex-col gap-2">
          <div onClick={onClick} className="cursor-pointer">
            <p className="font-medium text-sm">{atividade.cards_conversas?.titulo || 'Sem título'}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{atividade.descricao}</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-secondary px-2 py-1 rounded">{atividade.tipo}</span>
            {atividade.data_prevista && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(atividade.data_prevista), "dd/MM", { locale: ptBR })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-1">
            {telefone && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); onCopyPhone(telefone); }}>
                <Copy className="h-3 w-3 mr-1" />{telefone}
              </Button>
            )}
            {atividade.card_id && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard?cardId=${atividade.card_id}`); }}>
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
  
  const { data: atividades = [], isLoading, refetch } = useQuery({
    queryKey: ['atividades-admin', mostrarConcluidas, searchTerm, userId],
    queryFn: async () => {
      let query = supabase
        .from('atividades_cards')
        .select(`*, cards_conversas(id, titulo, telefone_lead, chatwoot_conversa_id)`)
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
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          {statusColumns.map((column) => {
            const columnAtividades = getAtividadesByStatus(column.id);
            return (
              <div key={column.id} className={`rounded-lg border-2 ${column.borderColor} ${column.bgColor}`}>
                <div className={`p-3 rounded-t-md ${column.headerBg}`}>
                  <h3 className="font-semibold text-white">{column.label} ({columnAtividades.length})</h3>
                </div>
                <DroppableColumn id={column.id}>
                  {columnAtividades.map((atividade) => (
                    <DraggableCard key={atividade.id} atividade={atividade} onClick={() => setSelectedAtividade(atividade)} onCopyPhone={handleCopyPhone} />
                  ))}
                  {columnAtividades.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade</p>}
                </DroppableColumn>
              </div>
            );
          })}
        </div>
      </DndContext>

      {selectedAtividade && (
        <AtividadeDetailsModal isOpen={!!selectedAtividade} onClose={() => setSelectedAtividade(null)} atividade={selectedAtividade} onSuccess={() => { refetch(); setSelectedAtividade(null); }} />
      )}
    </>
  );
};
