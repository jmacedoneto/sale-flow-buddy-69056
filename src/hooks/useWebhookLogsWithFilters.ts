import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WebhookLog {
  id: string;
  sync_type: string;
  status: string;
  event_type: string | null;
  conversation_id: number | null;
  card_id: string | null;
  error_message: string | null;
  latency_ms: number | null;
  payload: any;
  created_at: string;
}

export interface LogFilters {
  status?: 'success' | 'error' | 'all';
  period?: 'last_hour' | 'today' | 'yesterday' | 'all';
  searchTerm?: string;
}

/**
 * Hook para buscar logs de webhook com filtros avançados
 */
export const useWebhookLogsWithFilters = (filters: LogFilters = {}) => {
  return useQuery<WebhookLog[], Error>({
    queryKey: ['webhook-logs-filtered', filters],
    queryFn: async () => {
      let query = supabase
        .from('webhook_sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      // Filtro de status
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Filtro de período
      if (filters.period && filters.period !== 'all') {
        const now = new Date();
        let startDate: Date;

        switch (filters.period) {
          case 'last_hour':
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'yesterday':
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            startDate = new Date(yesterday.setHours(0, 0, 0, 0));
            const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));
            query = query.gte('created_at', startDate.toISOString())
                         .lte('created_at', endOfYesterday.toISOString());
            break;
          default:
            startDate = now;
        }

        if (filters.period !== 'yesterday') {
          query = query.gte('created_at', startDate.toISOString());
        }
      }

      // Filtro de busca por conversation_id ou card_id
      if (filters.searchTerm) {
        const searchNum = parseInt(filters.searchTerm);
        if (!isNaN(searchNum)) {
          query = query.eq('conversation_id', searchNum);
        } else if (filters.searchTerm.length > 10) {
          // Assumir que é UUID de card
          query = query.eq('card_id', filters.searchTerm);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useWebhookLogsWithFilters] Erro:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 10000, // 10 segundos
  });
};

/**
 * Função helper para exportar logs como JSON
 */
export const exportLogsAsJSON = (logs: WebhookLog[]) => {
  const dataStr = JSON.stringify(logs, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `webhook-logs-${new Date().toISOString()}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Função helper para exportar logs como CSV
 */
export const exportLogsAsCSV = (logs: WebhookLog[]) => {
  const headers = [
    'ID',
    'Tipo de Sync',
    'Status',
    'Evento',
    'Conversa ID',
    'Card ID',
    'Erro',
    'Latência (ms)',
    'Data/Hora'
  ];

  const rows = logs.map(log => [
    log.id,
    log.sync_type,
    log.status,
    log.event_type || '',
    log.conversation_id?.toString() || '',
    log.card_id || '',
    log.error_message || '',
    log.latency_ms?.toString() || '',
    new Date(log.created_at).toLocaleString('pt-BR')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `webhook-logs-${new Date().toISOString()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
