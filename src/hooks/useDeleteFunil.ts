import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useDeleteFunil = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (funilId: string) => {
      // Verificar se existem cards ativos no funil
      const { count, error: countError } = await supabase
        .from('cards_conversas')
        .select('id', { count: 'exact', head: true })
        .eq('funil_id', funilId)
        .neq('status', 'ganho')
        .neq('status', 'perdido');

      if (countError) throw countError;

      if (count && count > 0) {
        throw new Error(`Não é possível excluir um funil que contém ${count} card(s) ativo(s). Mova ou finalize os cards primeiro.`);
      }

      // Deletar funil
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
