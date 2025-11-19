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
      // Invalidar TODAS as queries relevantes para garantir atualização imediata
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['all_cards'] });
      queryClient.invalidateQueries({ queryKey: ['cards_conversas'] });
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      queryClient.invalidateQueries({ queryKey: ['atividades-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['atividades-lista'] });
      toast.success('Card atualizado do Chatwoot!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });
};