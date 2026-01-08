import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useDeleteFunil = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (funilId: string) => {
      // Usar RPC para evitar erro PGRST201 de ambiguidade nas foreign keys
      const { data: count, error: countError } = await supabase
        .rpc('count_cards_by_funil', { p_funil_id: funilId });

      if (countError) {
        console.error('Erro ao contar cards:', countError);
        throw new Error('Erro ao verificar cards do funil');
      }

      if (count && count > 0) {
        throw new Error(
          `Não é possível excluir um funil que contém ${count} card(s). ` +
          `Para excluir, primeiro mova ou exclua todos os cards (incluindo ganhos e perdidos).`
        );
      }

      // Deletar funil (CASCADE já cuida das etapas)
      const { error: deleteError } = await supabase
        .from('funis')
        .delete()
        .eq('id', funilId);

      if (deleteError) {
        // RLS pode bloquear a exclusão se o usuário não for admin
        if (deleteError.code === '42501' || deleteError.message?.includes('policy')) {
          throw new Error('Você não tem permissão para excluir funis. Apenas administradores podem fazer isso.');
        }
        throw deleteError;
      }
    },
    onSuccess: () => {
      toast.success('Funil excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['funis'] });
      queryClient.invalidateQueries({ queryKey: ['etapas'] });
    },
    onError: (error: any) => {
      console.error('Erro ao excluir funil:', error);
      const mensagem = error?.message || error?.details || 'Erro desconhecido ao excluir funil';
      toast.error(mensagem);
    },
  });
};
