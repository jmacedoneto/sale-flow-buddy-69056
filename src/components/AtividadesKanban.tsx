import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { AtividadeCard } from '@/types/database';
import { Clock, User, Phone, Mail } from 'lucide-react';
import { format, addDays, isToday, isTomorrow, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AtividadesKanbanProps {
  filters: {
    produto: string | null;
    funil: string | null;
    usuario: string | null;
  };
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

export const AtividadesKanban = ({ filters }: AtividadesKanbanProps) => {
  const { data: atividades = [], isLoading } = useQuery({
    queryKey: ['atividades-kanban', filters],
    queryFn: async () => {
      let query = supabase
        .from('atividades_cards')
        .select(`
          *,
          cards_conversas!inner(
            id,
            titulo,
            funil_id,
            funis(nome)
          )
        `)
        .eq('status', 'pendente')
        .not('data_prevista', 'is', null)
        .order('data_prevista', { ascending: true });

      if (filters.usuario) {
        query = query.eq('user_id', filters.usuario);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const hoje = new Date();
  const amanha = addDays(hoje, 1);
  const seteDias = addDays(hoje, 7);

  const colunas = {
    hoje: atividades.filter((a) => a.data_prevista && isToday(new Date(a.data_prevista))),
    amanha: atividades.filter((a) => a.data_prevista && isTomorrow(new Date(a.data_prevista))),
    proxima: atividades.filter(
      (a) =>
        a.data_prevista &&
        isAfter(new Date(a.data_prevista), amanha) &&
        isBefore(new Date(a.data_prevista), seteDias)
    ),
  };

  const renderCard = (atividade: any) => (
    <Card key={atividade.id} className="mb-3 cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <div className="mt-1">{getActivityIcon(atividade.tipo)}</div>
          <div className="flex-1">
            <p className="font-medium text-sm">{atividade.cards_conversas?.titulo || 'Sem título'}</p>
            <p className="text-xs text-muted-foreground mt-1">{atividade.descricao}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-secondary px-2 py-1 rounded">{atividade.tipo}</span>
              {atividade.data_prevista && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(atividade.data_prevista), 'HH:mm', { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <div className="p-4">Carregando atividades...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {/* Coluna HOJE */}
      <div>
        <div className="bg-primary/10 p-3 rounded-t-lg">
          <h3 className="font-semibold">HOJE ({colunas.hoje.length})</h3>
        </div>
        <div className="bg-muted/30 p-3 rounded-b-lg min-h-[400px]">
          {colunas.hoje.map(renderCard)}
          {colunas.hoje.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma atividade para hoje
            </p>
          )}
        </div>
      </div>

      {/* Coluna AMANHÃ */}
      <div>
        <div className="bg-secondary/30 p-3 rounded-t-lg">
          <h3 className="font-semibold">AMANHÃ ({colunas.amanha.length})</h3>
        </div>
        <div className="bg-muted/30 p-3 rounded-b-lg min-h-[400px]">
          {colunas.amanha.map(renderCard)}
          {colunas.amanha.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma atividade para amanhã
            </p>
          )}
        </div>
      </div>

      {/* Coluna PRÓXIMOS 7 DIAS */}
      <div>
        <div className="bg-accent/30 p-3 rounded-t-lg">
          <h3 className="font-semibold">PRÓXIMOS 7 DIAS ({colunas.proxima.length})</h3>
        </div>
        <div className="bg-muted/30 p-3 rounded-b-lg min-h-[400px]">
          {colunas.proxima.map(renderCard)}
          {colunas.proxima.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma atividade nos próximos dias
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
