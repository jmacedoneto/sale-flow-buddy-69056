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
    staleTime: 5000,
    // Só faz polling se não houver erro (evita repetir chamadas para conversas inexistentes)
    refetchInterval: (query) => {
      return query.state.error ? false : 10000;
    },
    refetchOnWindowFocus: true,
    retry: false, // Não tenta novamente em caso de erro
  });
};
