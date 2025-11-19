import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type UserStatus = 'pending' | 'approved' | 'blocked';

interface UpdateUserStatusParams {
  userId: string;
  status: UserStatus;
}

/**
 * Hook para atualizar status de usuário (pending/approved/blocked)
 */
export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, status }: UpdateUserStatusParams) => {
      const { error } = await supabase
        .from('users_crm')
        .update({ status })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      const messages = {
        approved: 'Usuário aprovado com sucesso!',
        blocked: 'Usuário bloqueado.',
        pending: 'Status atualizado para pendente.',
      };
      
      toast.success(messages[status]);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });
};
