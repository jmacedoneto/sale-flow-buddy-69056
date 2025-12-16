import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { AtividadeCard } from '@/types/database';
import { Clock, Phone, Mail } from 'lucide-react';
import { format, addDays, isToday, isTomorrow, isBefore, isAfter, differenceInDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useKanbanColors } from '@/hooks/useKanbanColors';
import { useState } from 'react';
import { AtividadeDetailsModal } from './AtividadeDetailsModal';
import { toast } from 'sonner';
import { DndContext, DragEndEvent, closestCenter, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';

interface AtividadesKanbanProps {
  filters: {
    produto: string | null;
    funil: string | null;
    usuario: string | null;
  };
  searchTerm: string;
  prioridade: 'todas' | 'baixa' | 'media' | 'alta' | 'urgente';
  periodo: 'todos' | 'hoje' | 'esta_semana' | 'este_mes';
}

const getActivityIcon = (tipo: string) => {
  switch (tipo.toLowerCase()) {
    case 'ligacao':
      return <Phone className="h-4 w-4" />;
    case 'email':
      return <Mail className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

// Componente Droppable para as colunas
const DroppableColumn = ({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div 
      ref={setNodeRef} 
      className={`min-h-[400px] p-3 rounded-b-lg transition-all ${isOver ? 'ring-2 ring-primary bg-primary/10' : 'bg-muted/30 dark:bg-slate-800/50'} ${className || ''}`}
    >
      {children}
    </div>
  );
};

// Componente Draggable para os cards
const DraggableActivityCard = ({ 
  atividade, 
  onClick,
  hoje
}: { 
  atividade: any; 
  onClick: () => void;
  hoje: Date;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: atividade.id });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  } : undefined;

  const dataPrevista = atividade.data_prevista ? new Date(atividade.data_prevista) : null;
  const diasDiferenca = dataPrevista ? differenceInDays(dataPrevista, hoje) : 0;
  const isVencida = diasDiferenca < 0;
  const cor = isVencida ? "border-red-500" : diasDiferenca === 0 ? "border-yellow-500" : "border-green-500";
  
  const avatarUrl = atividade.cards_conversas?.avatar_lead_url;
  const leadInitials = atividade.cards_conversas?.titulo 
    ? atividade.cards_conversas.titulo.substring(0, 2).toUpperCase() 
    : "??";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`mb-3 hover:shadow-md transition-shadow ${cor} border-l-4 bg-card/95 dark:bg-slate-100/95 dark:text-slate-900 cursor-grab active:cursor-grabbing group rounded-xl overflow-hidden`}
    >
      {/* Indicador visual de drag */}
      <div className="h-1.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardContent className="p-4 cursor-pointer" onClick={onClick}>
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0 border-2 border-primary/20 shadow-sm">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt={atividade.cards_conversas?.titulo} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-semibold">
              {leadInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm line-clamp-1 hover:text-primary transition-colors">
              {atividade.cards_conversas?.titulo || 'Sem título'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{atividade.descricao}</p>
            
            {/* Badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">
                {atividade.tipo}
              </Badge>
              {atividade.data_prevista && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(atividade.data_prevista), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              )}
              {isVencida && (
                <Badge variant="destructive" className="text-[10px]">
                  Vencida há {Math.abs(diasDiferenca)}d
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const AtividadesKanban = ({ filters, searchTerm, prioridade, periodo }: AtividadesKanbanProps) => {
  const { colors } = useKanbanColors();
  const [selectedAtividade, setSelectedAtividade] = useState<any | null>(null);
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);
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
    queryKey: ['atividades-kanban', filters, mostrarConcluidas, prioridade, periodo],
    queryFn: async () => {
      let query = supabase
        .from('atividades_cards')
        .select(`
          *,
          cards_conversas!inner(
            id,
            titulo,
            funil_id,
            chatwoot_conversa_id,
            prioridade,
            avatar_lead_url,
            funis(nome)
          )
        `)
        .not('data_prevista', 'is', null)
        .order('data_prevista', { ascending: true });

      if (!mostrarConcluidas) {
        query = query.eq('status', 'pendente');
      }

      if (filters.usuario) {
        query = query.eq('user_id', filters.usuario);
      }

      if (filters.funil) {
        query = query.eq('cards_conversas.funil_id', filters.funil);
      }
      
      if (prioridade !== 'todas') {
        query = query.eq('cards_conversas.prioridade', prioridade);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      let filtered = data;
      if (searchTerm) {
        filtered = data.filter(a => 
          a.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.cards_conversas?.titulo?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return filtered;
    },
  });

  const hoje = startOfDay(new Date());
  const amanha = addDays(hoje, 1);
  const seteDias = addDays(hoje, 7);

  const atividadesPendentes = atividades.filter(a => a.status !== 'concluida');
  const atividadesConcluidas = atividades.filter(a => a.status === 'concluida');

  const colunas = {
    vencidas: atividadesPendentes.filter((a) => a.data_prevista && isBefore(startOfDay(new Date(a.data_prevista)), hoje)),
    hoje: atividadesPendentes.filter((a) => a.data_prevista && isToday(new Date(a.data_prevista))),
    amanha: atividadesPendentes.filter((a) => a.data_prevista && isTomorrow(new Date(a.data_prevista))),
    estaSemana: atividadesPendentes.filter(
      (a) =>
        a.data_prevista &&
        isAfter(new Date(a.data_prevista), amanha) &&
        isBefore(new Date(a.data_prevista), seteDias)
    ),
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const atividadeId = active.id as string;
    const targetColumn = over.id as string;
    
    let novaData: Date;
    
    switch (targetColumn) {
      case 'hoje':
        novaData = hoje;
        break;
      case 'amanha':
        novaData = amanha;
        break;
      case 'estaSemana':
        novaData = addDays(hoje, 3);
        break;
      case 'vencidas':
        return; // Não permitir arrastar para vencidas
      default:
        return;
    }

    try {
      const { error } = await supabase
        .from('atividades_cards')
        .update({ data_prevista: format(novaData, 'yyyy-MM-dd') })
        .eq('id', atividadeId);

      if (error) throw error;
      
      toast.success('Atividade reagendada');
      queryClient.invalidateQueries({ queryKey: ['atividades-kanban'] });
    } catch (error) {
      console.error('Erro ao reagendar atividade:', error);
      toast.error('Erro ao reagendar atividade');
    }
  };

  if (isLoading) {
    return <div className="p-4">Carregando atividades...</div>;
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
          {/* Coluna VENCIDAS */}
          <div>
            <div className="p-3 rounded-t-lg bg-red-500">
              <h3 className="font-semibold text-white">VENCIDAS ({colunas.vencidas.length})</h3>
            </div>
            <DroppableColumn id="vencidas">
              {colunas.vencidas.map((atividade) => (
                <DraggableActivityCard 
                  key={atividade.id} 
                  atividade={atividade} 
                  onClick={() => setSelectedAtividade(atividade)}
                  hoje={hoje}
                />
              ))}
              {colunas.vencidas.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma atividade vencida
                </p>
              )}
            </DroppableColumn>
          </div>

          {/* Coluna HOJE */}
          <div>
            <div className="p-3 rounded-t-lg" style={{ backgroundColor: colors.hoje }}>
              <h3 className="font-semibold text-white">HOJE ({colunas.hoje.length})</h3>
            </div>
            <DroppableColumn id="hoje">
              {colunas.hoje.map((atividade) => (
                <DraggableActivityCard 
                  key={atividade.id} 
                  atividade={atividade} 
                  onClick={() => setSelectedAtividade(atividade)}
                  hoje={hoje}
                />
              ))}
              {colunas.hoje.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma atividade para hoje
                </p>
              )}
            </DroppableColumn>
          </div>

          {/* Coluna AMANHÃ */}
          <div>
            <div className="p-3 rounded-t-lg" style={{ backgroundColor: colors.amanha }}>
              <h3 className="font-semibold text-white">AMANHÃ ({colunas.amanha.length})</h3>
            </div>
            <DroppableColumn id="amanha">
              {colunas.amanha.map((atividade) => (
                <DraggableActivityCard 
                  key={atividade.id} 
                  atividade={atividade} 
                  onClick={() => setSelectedAtividade(atividade)}
                  hoje={hoje}
                />
              ))}
              {colunas.amanha.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma atividade para amanhã
                </p>
              )}
            </DroppableColumn>
          </div>

          {/* Coluna PRÓXIMOS 7 DIAS */}
          <div>
            <div className="p-3 rounded-t-lg" style={{ backgroundColor: colors.proxima }}>
              <h3 className="font-semibold text-white">PRÓXIMOS 7 DIAS ({colunas.estaSemana.length})</h3>
            </div>
            <DroppableColumn id="estaSemana">
              {colunas.estaSemana.map((atividade) => (
                <DraggableActivityCard 
                  key={atividade.id} 
                  atividade={atividade} 
                  onClick={() => setSelectedAtividade(atividade)}
                  hoje={hoje}
                />
              ))}
              {colunas.estaSemana.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma atividade nos próximos dias
                </p>
              )}
            </DroppableColumn>
          </div>
        </div>
      </DndContext>

      {mostrarConcluidas && atividadesConcluidas.length > 0 && (
        <div className="p-4">
          <h3 className="font-semibold mb-3">Atividades Concluídas ({atividadesConcluidas.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {atividadesConcluidas.map((atividade) => (
              <DraggableActivityCard 
                key={atividade.id} 
                atividade={atividade} 
                onClick={() => setSelectedAtividade(atividade)}
                hoje={hoje}
              />
            ))}
          </div>
        </div>
      )}

      {selectedAtividade && (
        <AtividadeDetailsModal
          isOpen={!!selectedAtividade}
          onClose={() => setSelectedAtividade(null)}
          atividade={selectedAtividade}
          onSuccess={() => {
            refetch();
            setSelectedAtividade(null);
          }}
        />
      )}
    </>
  );
};
