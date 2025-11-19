import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

export const DashboardResumo = () => {
  const { data: userId } = useQuery({
    queryKey: ['currentUserId'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id;
    }
  });

  const { data: tarefasHoje } = useQuery({
    queryKey: ['tarefas-hoje', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('atividades_cards')
        .select(`
          *,
          cards_conversas(id, titulo)
        `)
        .eq('user_id', userId)
        .eq('status', 'pendente')
        .gte('data_prevista', hoje.toISOString())
        .lte('data_prevista', new Date(hoje.getTime() + 86400000).toISOString())
        .order('data_prevista', { ascending: true })
        .limit(5);
        
      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  const { data: tarefasVencidas } = useQuery({
    queryKey: ['tarefas-vencidas', userId],
    queryFn: async () => {
      if (!userId) return 0;
      
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const { count, error } = await supabase
        .from('atividades_cards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pendente')
        .lt('data_prevista', hoje.toISOString());
        
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId
  });

  const { data: tarefasProximas } = useQuery({
    queryKey: ['tarefas-proximas', userId],
    queryFn: async () => {
      if (!userId) return 0;
      
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);
      const seteDias = new Date(hoje.getTime() + 7 * 86400000);
      
      const { count, error } = await supabase
        .from('atividades_cards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pendente')
        .gt('data_prevista', hoje.toISOString())
        .lte('data_prevista', seteDias.toISOString());
        
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId
  });

  return (
    <div className="space-y-6">
      {/* Estatísticas de Tarefas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tarefasHoje?.length || 0}</div>
            <p className="text-xs text-muted-foreground">follow-ups para hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{tarefasVencidas || 0}</div>
            <p className="text-xs text-muted-foreground">tarefas atrasadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Próximos 7 Dias</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tarefasProximas || 0}</div>
            <p className="text-xs text-muted-foreground">follow-ups agendados</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Próximas Atividades */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Próximas Atividades</CardTitle>
            <Link to="/atividades">
              <Button variant="outline" size="sm">Ver Todas</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {tarefasHoje && tarefasHoje.length > 0 ? (
            <div className="space-y-3">
              {tarefasHoje.map((tarefa: any) => (
                <div 
                  key={tarefa.id} 
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <Link 
                      to={`/dashboard?cardId=${tarefa.cards_conversas?.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {tarefa.cards_conversas?.titulo || 'Card sem título'}
                    </Link>
                    <p className="text-sm text-muted-foreground">{tarefa.descricao}</p>
                    {tarefa.data_prevista && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(tarefa.data_prevista), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                    {tarefa.tipo}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma atividade para hoje
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
