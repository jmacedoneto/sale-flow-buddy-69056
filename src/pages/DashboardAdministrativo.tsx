import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFunis } from "@/hooks/useFunis";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FunnelChart } from "@/components/dashboard/FunnelChart";

interface EtapaMetric {
  name: string;
  value: number;
}

interface StatusMetric {
  name: string;
  value: number;
}

interface DashboardMetrics {
  etapas: EtapaMetric[];
  status: StatusMetric[];
}

const ETAPAS_ADMIN = [
  'Demanda Aberta',
  'Em Resolução',
  'Aguardando Retorno',
  'Concluído/Arquivado'
];

const FUNIS_ADMIN = [
  'Eventos Colisão',
  'Eventos Terceiros',
  'Suporte ADM Associado',
  'Suporte ADM Consultor'
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function DashboardAdministrativo() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({ etapas: [], status: [] });
  const [loading, setLoading] = useState(true);
  const { data: funis = [] } = useFunis();

  // Encontrar funis administrativos (excluir Comercial)
  const funisAdmin = funis.filter(f => f.nome !== 'Comercial');

  useEffect(() => {
    if (funisAdmin.length === 0) return;
    
    const fetchMetrics = async () => {
      try {
        // Query otimizada: buscar todos os cards dos funis admin de uma vez
        const { data: aggregatedData, error } = await supabase
          .from('cards_conversas')
          .select('funil_etapa, funil_nome')
          .in('funil_nome', FUNIS_ADMIN);

        if (error) throw error;

        // Contar manualmente no cliente
        const countsByEtapa: Record<string, number> = {};
        ETAPAS_ADMIN.forEach(etapa => countsByEtapa[etapa] = 0);
        
        (aggregatedData || []).forEach((row: any) => {
          if (countsByEtapa[row.funil_etapa] !== undefined) {
            countsByEtapa[row.funil_etapa]++;
          }
        });

        // Distribuição por etapa
        const etapas: EtapaMetric[] = ETAPAS_ADMIN.map((etapa) => ({
          name: etapa,
          value: countsByEtapa[etapa] || 0,
        }));

        // Status: Resolvido vs Pendente
        const resolvido = countsByEtapa['Concluído/Arquivado'] || 0;
        const pendente = Object.entries(countsByEtapa)
          .filter(([key]) => key !== 'Concluído/Arquivado')
          .reduce((sum, [, val]) => sum + val, 0);

        const status: StatusMetric[] = [
          { name: 'Resolvido', value: resolvido },
          { name: 'Pendente', value: pendente },
        ];

        setMetrics({ etapas, status });
      } catch (error) {
        console.error('Erro ao buscar métricas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [funisAdmin.length]);

  // KPIs principais
  const totalDemandas = metrics.etapas.reduce((sum, item) => sum + item.value, 0);
  const resolvidas = metrics.status.find(s => s.name === 'Resolvido')?.value || 0;
  const pendentes = metrics.status.find(s => s.name === 'Pendente')?.value || 0;

  // Preparar dados para FunnelChart
  const funnelStages = metrics.etapas.map((item, idx) => ({
    name: item.name,
    count: item.value,
    color: COLORS[idx],
  }));

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
            <p className="text-muted-foreground">Métricas dos funis administrativos</p>
          </div>
          <Link to="/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando métricas...</p>
          </div>
        ) : (
          <>
            {/* KPIs no Topo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                title="Total de Demandas"
                value={totalDemandas}
                description="Todas as demandas administrativas"
                icon={AlertCircle}
              />
              <MetricCard
                title="Resolvidas"
                value={resolvidas}
                description="Demandas concluídas/arquivadas"
                icon={CheckCircle}
              />
              <MetricCard
                title="Pendentes"
                value={pendentes}
                description="Aguardando resolução"
                icon={Clock}
              />
            </div>

            {/* Funil Administrativo */}
            <FunnelChart 
              stages={funnelStages}
              title="Distribuição por Etapa"
              description="Status das demandas administrativas"
            />

            {/* Distribuição por Etapa */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Demandas por Etapa</CardTitle>
                <CardDescription>
                  Quantidade total de cards em cada etapa (todos os funis administrativos)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.etapas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Bar dataKey="value" name="Quantidade de Demandas">
                      {metrics.etapas.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status: Resolvido vs Pendente */}
            <Card>
              <CardHeader>
                <CardTitle>Status Geral</CardTitle>
                <CardDescription>
                  Proporção de demandas resolvidas vs pendentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.status}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => 
                        `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {metrics.status.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#00C49F' : '#FF8042'} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tabela de Métricas */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas Detalhadas</CardTitle>
                <CardDescription>Resumo numérico por etapa</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Etapa</th>
                        <th className="text-right p-3 text-sm font-medium text-muted-foreground">Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.etapas.map((item, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-muted/50">
                          <td className="p-3 text-sm">{item.name}</td>
                          <td className="p-3 text-sm text-right font-medium">{item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
