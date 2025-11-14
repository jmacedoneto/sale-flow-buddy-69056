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
    refetchInterval: 10000, // Auto-refresh a cada 10s
  });
};

export const useWebhookStats = () => {
  return useQuery<WebhookStats>({
    queryKey: ['webhook-stats'],
    queryFn: getWebhookStats,
    refetchInterval: 15000, // Auto-refresh a cada 15s
  });
};

export const useCleanOldLogs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cleanOldLogs,
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ['webhook-logs'] });
      queryClient.invalidateQueries({ queryKey: ['webhook-stats'] });
      toast({
        title: "✓ Logs limpos",
        description: `${deletedCount} logs antigos removidos com sucesso.`,
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
