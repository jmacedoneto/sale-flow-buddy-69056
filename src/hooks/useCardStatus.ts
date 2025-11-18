import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CardStatus = 'ganho' | 'perdido';

interface UpdateCardStatusParams {
  cardId: string;
  status: CardStatus;
  motivo: string;
  funilId?: string;
}

export const useCardStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cardId, status, motivo, funilId }: UpdateCardStatusParams) => {
      // 1. Arquivar card do funil ativo
      const { error: updateError } = await supabase
        .from('cards_conversas')
        .update({
          status,
          arquivado: true,
          pausado: status === 'perdido' ? false : undefined,
        })
        .eq('id', cardId);

      if (updateError) throw updateError;

      // 2. Mover para tabela apropriada
      const tableName = status === 'ganho' ? 'cards_ganhos' : 'cards_perdidos';
      const { error: insertError } = await supabase
        .from(tableName)
        .insert({
          card_id: cardId,
          funil_id: funilId,
          motivo,
          data_status: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success(`Card marcado como ${variables.status.toUpperCase()}`);
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar status do card:', error);
      toast.error('Erro ao atualizar status do card');
    },
  });
};
