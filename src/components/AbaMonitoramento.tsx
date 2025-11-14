import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWebhookLogs, useWebhookStats, useCleanOldLogs } from "@/hooks/useWebhookLogs";
import { 
  Activity, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeftRight, 
  Clock, 
  Trash2,
  RefreshCw,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const AbaMonitoramento = () => {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [syncTypeFilter, setSyncTypeFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");

  const filters = {
    ...(statusFilter !== "all" && { status: statusFilter as any }),
    ...(syncTypeFilter !== "all" && { sync_type: syncTypeFilter as any }),
    ...(timeFilter !== "all" && { hours: parseInt(timeFilter) }),
  };

  const { data: logsData, isLoading: logsLoading, refetch } = useWebhookLogs(page, filters);
  const { data: stats, isLoading: statsLoading } = useWebhookStats();
  const cleanLogs = useCleanOldLogs();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Erro</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Aviso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSyncTypeIcon = (syncType: string) => {
    return syncType === 'chatwoot_to_lovable' 
      ? <ArrowRight className="h-4 w-4 text-primary" />
      : <ArrowLeft className="h-4 w-4 text-secondary" />;
  };

  const formatLatency = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Syncs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.total_syncs || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.last_24h_count || 0} nas últimas 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? "..." : stats 
                ? `${Math.round((stats.success_count / Math.max(stats.total_syncs, 1)) * 100)}%`
                : "0%"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.success_count || 0} sucessos / {stats?.error_count || 0} erros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latência Média</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : formatLatency(stats?.avg_latency_ms || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimas 100 operações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Bidirecional</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-sm">
              <div>
                <div className="font-bold text-primary">{stats?.chatwoot_to_lovable_count || 0}</div>
                <div className="text-xs text-muted-foreground">CW → Lovable</div>
              </div>
              <div className="border-l pl-2">
                <div className="font-bold text-secondary">{stats?.lovable_to_chatwoot_count || 0}</div>
                <div className="text-xs text-muted-foreground">Lovable → CW</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Ações */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Sincronização</CardTitle>
          <CardDescription>
            Monitoramento em tempo real das operações de webhook
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
              </SelectContent>
            </Select>

            <Select value={syncTypeFilter} onValueChange={setSyncTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de Sync" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="chatwoot_to_lovable">Chatwoot → Lovable</SelectItem>
                <SelectItem value="lovable_to_chatwoot">Lovable → Chatwoot</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="1">Última hora</SelectItem>
                <SelectItem value="24">Últimas 24h</SelectItem>
                <SelectItem value="168">Última semana</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => cleanLogs.mutate()}
              disabled={cleanLogs.isPending}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Limpar Antigos
            </Button>
          </div>

          {/* Tabela de Logs */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Data/Hora</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Tipo</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead className="w-[100px]">Conv ID</TableHead>
                  <TableHead className="w-[100px]">Latência</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Carregando logs...
                    </TableCell>
                  </TableRow>
                ) : logsData && logsData.logs.length > 0 ? (
                  logsData.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          {getSyncTypeIcon(log.sync_type)}
                          {log.sync_type === 'chatwoot_to_lovable' ? 'CW→LV' : 'LV→CW'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{log.event_type || '-'}</TableCell>
                      <TableCell className="text-xs">{log.conversation_id || '-'}</TableCell>
                      <TableCell className="text-xs">{formatLatency(log.latency_ms)}</TableCell>
                      <TableCell className="text-xs text-destructive truncate max-w-[200px]">
                        {log.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum log encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {logsData && logsData.totalCount > 50 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {page * 50 + 1} - {Math.min((page + 1) * 50, logsData.totalCount)} de {logsData.totalCount}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * 50 >= logsData.totalCount}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
