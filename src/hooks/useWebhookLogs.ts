import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getWebhookLogs, 
  getWebhookStats, 
  cleanOldLogs,
  type WebhookLog,
  type WebhookStats 
} from "@/services/webhookLogsService";
import { toast } from "@/hooks/use-toast";

export const useWebhookLogs = (
  page: number = 0,
  filters?: {
    status?: 'success' | 'error' | 'warning';
    sync_type?: 'chatwoot_to_lovable' | 'lovable_to_chatwoot';
    hours?: number;
  }
) => {
  return useQuery<{ logs: WebhookLog[]; totalCount: number }>({
    queryKey: ['webhook-logs', page, filters],
    queryFn: () => getWebhookLogs(page, 50, filters),
    refetchInterval: 10000,
  });
};

export const useWebhookStats = () => {
  return useQuery<WebhookStats>({
    queryKey: ['webhook-stats'],
    queryFn: getWebhookStats,
    refetchInterval: 15000,
  });
};

export const useCleanOldLogs = () => {
  const queryClient = useQueryClient();

  return useMutation<number, Error, number>({
    mutationFn: (days: number) => cleanOldLogs(days),
    onSuccess: (deletedCount, days) => {
      queryClient.invalidateQueries({ queryKey: ['webhook-logs'] });
      queryClient.invalidateQueries({ queryKey: ['webhook-stats'] });
      toast({
        title: "✓ Logs limpos",
        description: `${deletedCount} logs com mais de ${days} dia(s) removidos.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro ao limpar logs",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
