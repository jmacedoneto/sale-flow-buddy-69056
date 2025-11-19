import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncCardFromChatwoot } from '@/services/chatwootSyncService';
import { toast } from 'sonner';

/**
 * Hook para sincronizar card do Chatwoot
 */
export const useSyncCardFromChatwoot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, conversationId }: { cardId: string; conversationId: number }) => {
      return await syncCardFromChatwoot(cardId, conversationId);
    },
    onSuccess: () => {
      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      queryClient.invalidateQueries({ queryKey: ['atividades-kanban'] });
      toast.success('Card atualizado do Chatwoot!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });
};