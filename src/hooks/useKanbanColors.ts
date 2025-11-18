import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface KanbanColors {
  hoje: string;
  amanha: string;
  proxima: string;
}

const DEFAULT_COLORS: KanbanColors = {
  hoje: '#ef4444', // red
  amanha: '#f59e0b', // amber
  proxima: '#10b981', // green
};

export const useKanbanColors = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: colors = DEFAULT_COLORS } = useQuery({
    queryKey: ['kanban-colors', user?.id],
    queryFn: async () => {
      if (!user?.id) return DEFAULT_COLORS;

      const { data, error } = await supabase
        .from('kanban_colors')
        .select('coluna, cor')
        .eq('user_id', user.id);

      if (error) throw error;

      if (!data || data.length === 0) return DEFAULT_COLORS;

      const colorMap: any = { ...DEFAULT_COLORS };
      data.forEach((item) => {
        colorMap[item.coluna] = item.cor;
      });

      return colorMap as KanbanColors;
    },
    enabled: !!user?.id,
  });

  const updateColorMutation = useMutation({
    mutationFn: async ({ coluna, cor }: { coluna: string; cor: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('kanban_colors')
        .upsert(
          {
            user_id: user.id,
            coluna,
            cor,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,coluna' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-colors'] });
      toast.success('Cor atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar cor');
    },
  });

  return {
    colors,
    updateColor: updateColorMutation.mutate,
    isUpdating: updateColorMutation.isPending,
  };
};
