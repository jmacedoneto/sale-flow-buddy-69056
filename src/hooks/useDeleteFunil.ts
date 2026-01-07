import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useDeleteFunil = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (funilId: string) => {
      // Verificar se existem QUAISQUER cards no funil (ativos, ganhos ou perdidos)
      const { count, error: countError } = await supabase
        .from('cards_conversas')
        .select('id', { count: 'exact', head: true })
        .eq('funil_id', funilId);

      if (countError) throw countError;

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

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      toast.success('Funil excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['funis'] });
      queryClient.invalidateQueries({ queryKey: ['etapas'] });
    },
    onError: (error: any) => {
      console.error('Erro ao excluir funil:', error);
      toast.error(error.message || 'Erro ao excluir funil');
    },
  });
};
