import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePermissions } from "./usePermissions";

export const useUpdateCard = () => {
  const queryClient = useQueryClient();
  const { allowedFunilIds, canEditFunil } = usePermissions();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      // Debug de permissões
      console.log('[useUpdateCard] Verificando permissões:', {
        cardId: id,
        funilId: updates.funil_id,
        allowedFunilIds,
        canEdit: updates.funil_id ? canEditFunil(updates.funil_id) : 'N/A',
      });

      const { data, error } = await supabase
        .from("cards_conversas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error('[useUpdateCard] Erro ao atualizar card:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      queryClient.invalidateQueries({ queryKey: ["cards-sem-tarefa"] });
      queryClient.invalidateQueries({ queryKey: ["cards-com-prazo"] });
    },
    onError: (error: any) => {
      console.error("[useUpdateCard] Erro detalhado:", error);
      
      // Mensagem específica para erro de permissão
      if (error.message?.includes('permission') || error.message?.includes('policy')) {
        toast.error("Você não tem permissão para editar este card");
      } else {
        toast.error("Erro ao atualizar card");
      }
    },
  });
};
