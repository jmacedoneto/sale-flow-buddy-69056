import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AtividadeCard } from "@/types/database";

export const useAtividades = (cardId: string | null) => {
  return useQuery<AtividadeCard[]>({
    queryKey: ["atividades", cardId],
    queryFn: async () => {
      if (!cardId) return [];
      
      const { data, error } = await (supabase as any)
        .from("atividades_cards")
        .select("*")
        .eq("card_id", cardId)
        .order("data_criacao", { ascending: false });
      
      if (error) throw error;
      return (data || []) as AtividadeCard[];
    },
    enabled: !!cardId,
  });
};

export const useCreateAtividade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      cardId, 
      tipo, 
      descricao,
      sendToChatwoot = false,
      conversationId,
    }: { 
      cardId: string; 
      tipo: string; 
      descricao: string;
      sendToChatwoot?: boolean;
      conversationId?: number;
    }) => {
      // 1. Criar atividade no CRM
      const { data, error } = await (supabase as any)
        .from("atividades_cards")
        .insert({
          card_id: cardId,
          tipo,
          descricao,
          privado: sendToChatwoot, // marcar como privada se vai para Chatwoot
        })
        .select()
        .single();
      
      if (error) throw error;

      // 2. Se sendToChatwoot = true, enviar private note ao Chatwoot
      if (sendToChatwoot && conversationId) {
        try {
          const { sendChatwootMessage } = await import("@/services/chatwootMessagingService");
          await sendChatwootMessage({
            conversationId,
            content: `📝 ${tipo}: ${descricao}`,
            private: true,
          });
          console.log('[useCreateAtividade] Private note enviada ao Chatwoot');
        } catch (chatwootError) {
          // Log mas não falhar toda a operação
          console.error('[useCreateAtividade] Erro ao enviar private note:', chatwootError);
        }
      }

      return data as AtividadeCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      toast.success("Atividade registrada!");
    },
    onError: (error) => {
      console.error("Erro ao criar atividade:", error);
      toast.error("Erro ao registrar atividade");
    },
  });
};
