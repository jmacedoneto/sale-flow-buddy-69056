import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getChatwootConfig, 
  saveChatwootConfig, 
  testChatwootConnection,
  type ChatwootConfigInput 
} from "@/services/chatwootConfigService";
import { toast } from "@/hooks/use-toast";

/**
 * Hook para gerenciar a configuração do Chatwoot
 * Segue o princípio de separação de lógica de negócio da UI
 */
export const useChatwootConfig = () => {
  const queryClient = useQueryClient();

  // Query para buscar configuração
  const query = useQuery({
    queryKey: ['chatwoot-config'],
    queryFn: getChatwootConfig,
    staleTime: 30000, // 30 segundos
  });

  // Mutation para salvar configuração
  const saveMutation = useMutation({
    mutationFn: saveChatwootConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatwoot-config'] });
      toast({
        title: "✓ Configuração salva",
        description: "As configurações do Chatwoot foram salvas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para testar conexão
  const testMutation = useMutation({
    mutationFn: (params: { url: string; accountId: number; apiKey: string }) => 
      testChatwootConnection(params.url, params.accountId, params.apiKey),
    onSuccess: (data) => {
      if (data.ok) {
        toast({
          title: "✓ Chatwoot conectado com sucesso",
          description: data.message,
        });
      } else {
        toast({
          title: "❌ Erro ao conectar",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro ao testar conexão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    error: query.error,
    saveConfig: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    testConnection: testMutation.mutate,
    isTesting: testMutation.isPending,
  };
};
