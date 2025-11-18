import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, TrendingUp, Users, DollarSign, Clock } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

const MetricCard = ({ label, value, icon: Icon }: any) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <Icon className="h-8 w-8 text-primary" />
      </div>
    </CardContent>
  </Card>
);

export const DashboardHome = () => {
  const { user } = useAuth();

  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const [
        { count: totalConversations },
        { count: activeLeads },
        { count: activeSales },
        { data: conversionData },
      ] = await Promise.all([
        supabase.from('cards_conversas').select('*', { count: 'exact', head: true }),
        supabase
          .from('cards_conversas')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'em_andamento'),
        supabase
          .from('cards_conversas')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ganho'),
        supabase.from('cards_conversas').select('status'),
      ]);

      const total = conversionData?.length || 0;
      const ganhos = conversionData?.filter((c) => c.status === 'ganho').length || 0;
      const conversionRate = total > 0 ? ((ganhos / total) * 100).toFixed(1) : '0';

      return {
        total_conversations: totalConversations || 0,
        active_leads: activeLeads || 0,
        active_sales: activeSales || 0,
        conversion_rate: conversionRate,
      };
    },
  });

  const { data: userTasks = [] } = useQuery({
    queryKey: ['user-tasks-today', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const hoje = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('atividades_cards')
        .select(
          `
          *,
          cards_conversas!inner(id, titulo)
        `
        )
        .eq('user_id', user.id)
        .eq('status', 'pendente')
        .gte('data_prevista', hoje)
        .lte('data_prevista', `${hoje}T23:59:59`)
        .order('data_prevista', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: taskStats } = useQuery({
    queryKey: ['task-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { hoje: 0, vencidas: 0, comFollowUp: 0 };

      const hoje = new Date().toISOString().split('T')[0];
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);

      const [hojeResult, vencidasResult, followUpResult] = await Promise.all([
        supabase
          .from('atividades_cards')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'pendente')
          .gte('data_prevista', hoje)
          .lte('data_prevista', `${hoje}T23:59:59`),
        supabase
          .from('atividades_cards')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'pendente')
          .lt('data_prevista', hoje),
        supabase
          .from('cards_conversas')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', user.id)
          .not('data_retorno', 'is', null)
          .eq('status', 'em_andamento'),
      ]);

      return {
        hoje: hojeResult.count || 0,
        vencidas: vencidasResult.count || 0,
        comFollowUp: followUpResult.count || 0,
      };
    },
    enabled: !!user?.id,
  });

  const getActivityIcon = (tipo: string) => {
    return <Clock className="h-5 w-5 text-primary" />;
  };

  const hoursUntil = (date: string) => {
    return differenceInHours(new Date(date), new Date());
  };

  return (
    <div className="space-y-6 p-6">
      {/* Métricas Top */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Conversas"
          value={metrics?.total_conversations || 0}
          icon={MessageCircle}
        />
        <MetricCard
          label="Taxa Conversão"
          value={`${metrics?.conversion_rate || 0}%`}
          icon={TrendingUp}
        />
        <MetricCard label="Leads Ativos" value={metrics?.active_leads || 0} icon={Users} />
        <MetricCard label="Vendas Ativas" value={metrics?.active_sales || 0} icon={DollarSign} />
      </div>

      {/* Resumo de Atividades */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Atividades Hoje</p>
                <p className="text-3xl font-bold text-primary">{taskStats?.hoje || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidas</p>
                <p className="text-3xl font-bold text-red-600">{taskStats?.vencidas || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Com Follow-up</p>
                <p className="text-3xl font-bold text-green-600">{taskStats?.comFollowUp || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Social Feed - Tarefas do Dia */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Próximas Atividades ({format(new Date(), "dd 'de' MMMM", { locale: ptBR })})
            </h2>
            <Button variant="outline" size="sm" asChild>
              <a href="/atividades">Ver Todas</a>
            </Button>
          </div>

          <div className="space-y-3">
            {userTasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma tarefa agendada para hoje
              </p>
            ) : (
              userTasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      {getActivityIcon(task.tipo)}
                    </div>
                    <div>
                      <p className="font-medium">{task.cards_conversas?.titulo || 'Sem título'}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.tipo} - Vence em {Math.max(0, hoursUntil(task.data_prevista))}h
                      </p>
                    </div>
                  </div>
                  <Button size="sm">Ir</Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
