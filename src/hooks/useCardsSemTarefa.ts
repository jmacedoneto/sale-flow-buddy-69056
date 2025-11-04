import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getDataRetornoPadrao } from "@/services/cardStatusService";

/**
 * Hook para buscar contagem de cards sem tarefa agendada.
 */
export const useCardsSemTarefa = () => {
  return useQuery<number, Error>({
    queryKey: ['cards_sem_tarefa_count'],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from('cards_conversas')
        .select('*', { count: 'exact', head: true })
        .is('data_retorno', null);

      if (error) throw error;
      return count || 0;
    },
  });
};

/**
 * Hook para agendar tarefas em lote para cards sem data de retorno.
 */
export const useAgendarTarefasEmLote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const dataRetorno = getDataRetornoPadrao();
      
      const { error } = await (supabase as any)
        .from('cards_conversas')
        .update({ data_retorno: dataRetorno })
        .is('data_retorno', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_cards'] });
      queryClient.invalidateQueries({ queryKey: ['cards_sem_tarefa_count'] });
      toast.success('Tarefas agendadas com sucesso para +7 dias!');
    },
    onError: (error) => {
      console.error('Erro ao agendar tarefas:', error);
      toast.error('Erro ao agendar tarefas. Tente novamente.');
    },
  });
};
