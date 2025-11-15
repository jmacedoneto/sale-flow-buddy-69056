import { useQuery } from "@tanstack/react-query";
import { fetchChatwootMessages, ChatwootMessage } from "@/services/chatwootService";

/**
 * Hook para buscar mensagens de uma conversa do Chatwoot.
 * Segue o princípio de separação de lógica de negócio da UI.
 */
export const useChatwootMessages = (conversationId: number | null) => {
  return useQuery<ChatwootMessage[], Error>({
    queryKey: ['chatwoot-messages', conversationId],
    queryFn: () => {
      if (!conversationId) {
        throw new Error('conversationId é obrigatório');
      }
      return fetchChatwootMessages(conversationId);
    },
    enabled: !!conversationId,
    staleTime: 5000, // 5 segundos - mais agressivo para refletir mudanças rapidamente
    refetchInterval: 10000, // Polling a cada 10 segundos quando ativo
    refetchOnWindowFocus: true, // Refetch ao voltar para a janela
  });
};
