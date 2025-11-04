import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CardConversa } from "@/types/database";

interface CardsComPrazo {
  paraVencer: CardConversa[];
  vencidas: CardConversa[];
}

/**
 * Hook para buscar cards com prazo e separá-los em vencidos e a vencer.
 * Segue o princípio de separação de lógica de negócio da UI.
 */
export const useCardsComPrazo = () => {
  return useQuery<CardsComPrazo, Error>({
    queryKey: ['cards-com-prazo'],
    queryFn: async () => {
      console.log('[useCardsComPrazo] Buscando cards com prazo...');

      const { data, error } = await (supabase as any)
        .from('cards_conversas')
        .select('*')
        .not('prazo', 'is', null)
        .order('prazo', { ascending: true });

      if (error) {
        console.error('[useCardsComPrazo] Erro ao buscar cards:', error);
        throw error;
      }

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const paraVencer: CardConversa[] = [];
      const vencidas: CardConversa[] = [];

      ((data || []) as any[]).forEach(card => {
        if (!card.prazo) return;
        
        const prazoDate = new Date(card.prazo);
        prazoDate.setHours(0, 0, 0, 0);

        if (prazoDate >= hoje) {
          paraVencer.push(card as CardConversa);
        } else {
          vencidas.push(card as CardConversa);
        }
      });

      console.log(`[useCardsComPrazo] ${paraVencer.length} para vencer, ${vencidas.length} vencidas`);

      return { paraVencer, vencidas };
    },
    staleTime: 60000, // 1 minuto
  });
};
