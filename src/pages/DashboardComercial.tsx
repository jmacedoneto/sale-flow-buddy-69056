import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFunis } from "@/hooks/useFunis";

interface ConversionMetric {
  from: string;
  to: string;
  pct: number;
}

interface FunnelMetric {
  name: string;
  value: number;
  pct: number;
}

interface DashboardMetrics {
  conv: ConversionMetric[];
  funnel: FunnelMetric[];
}

const ETAPAS_COMERCIAL = [
  'Contato Inicial',
  'Qualificação Agendada',
  'Cotação Enviada | FollowUp',
  'Negociação',
  'Em Fechamento'
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function DashboardComercial() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({ conv: [], funnel: [] });
  const [loading, setLoading] = useState(true);
  const { data: funis = [] } = useFunis();

  // Encontrar funil Comercial
  const funilComercial = funis.find(f => f.nome === 'Comercial');

  useEffect(() => {
    if (!funilComercial) return;
    
    const fetchMetrics = async () => {
      try {
        // Query otimizada: agregar em uma única chamada
        const { data: aggregatedData, error } = await supabase
          .from('cards_conversas')
          .select('funil_etapa')
          .eq('funil_nome', 'Comercial');

        if (error) throw error;

        // Contar manualmente no cliente (Supabase não suporta GROUP BY diretamente)
        const counts: Record<string, number> = {};
        ETAPAS_COMERCIAL.forEach(etapa => counts[etapa] = 0);
        
        (aggregatedData || []).forEach((row: any) => {
          if (counts[row.funil_etapa] !== undefined) {
            counts[row.funil_etapa]++;
          }
        });

        // Calcular conversões entre etapas
        const conv: ConversionMetric[] = [];
        for (let i = 0; i < ETAPAS_COMERCIAL.length - 1; i++) {
          const curr = counts[ETAPAS_COMERCIAL[i]] || 1;
          const next = counts[ETAPAS_COMERCIAL[i + 1]] || 0;
          conv.push({
            from: ETAPAS_COMERCIAL[i].slice(0, 15),
            to: ETAPAS_COMERCIAL[i + 1].slice(0, 15),
            pct: Math.round((next / curr) * 100),
          });
        }

        // Calcular distribuição no funil
        const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
        const funnel: FunnelMetric[] = ETAPAS_COMERCIAL.map((etapa) => ({
          name: etapa.length > 18 ? etapa.slice(0, 18) + '...' : etapa,
          value: counts[etapa] || 0,
          pct: Math.round(((counts[etapa] || 0) / total) * 100),
        }));

        setMetrics({ conv, funnel });
      } catch (error) {
        console.error('Erro ao buscar métricas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [funilComercial]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Comercial</h1>
            <p className="text-muted-foreground">Métricas e análise do funil de vendas</p>
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
            {/* Taxa de Conversão entre Etapas */}
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Conversão entre Etapas</CardTitle>
                <CardDescription>
                  Percentual de conversão de uma etapa para a próxima
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.conv}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="from" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => `${value}%`}
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Bar dataKey="pct" fill="#8884d8" name="Taxa de Conversão (%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribuição no Funil */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Cards por Etapa</CardTitle>
                <CardDescription>
                  Quantidade e percentual de cards em cada etapa do funil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.funnel}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                    <Bar dataKey="value" name="Quantidade de Cards">
                      {metrics.funnel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
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
                        <th className="text-right p-3 text-sm font-medium text-muted-foreground">% do Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.funnel.map((item, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-muted/50">
                          <td className="p-3 text-sm">{ETAPAS_COMERCIAL[idx]}</td>
                          <td className="p-3 text-sm text-right font-medium">{item.value}</td>
                          <td className="p-3 text-sm text-right">{item.pct}%</td>
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
