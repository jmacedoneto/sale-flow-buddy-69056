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
      descricao 
    }: { 
      cardId: string; 
      tipo: string; 
      descricao: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from("atividades_cards")
        .insert({
          card_id: cardId,
          tipo,
          descricao,
        })
        .select()
        .single();
      
      if (error) throw error;
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
