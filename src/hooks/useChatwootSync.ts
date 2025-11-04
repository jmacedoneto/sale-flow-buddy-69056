import { useMutation } from "@tanstack/react-query";
import { 
  syncOptionsWithChatwoot, 
  syncChatwootCustomAttributes,
  type SyncChatwootPayload 
} from "@/services/chatwootSyncService";
import { toast } from "@/hooks/use-toast";

/**
 * Hook para sincronizar opções com o Chatwoot
 */
export const useChatwootSync = () => {
  const syncOptionsMutation = useMutation({
    mutationFn: syncOptionsWithChatwoot,
    onSuccess: (data) => {
      toast({
        title: "✓ Sincronização concluída",
        description: `${data.funis} funis e ${data.etapas} etapas sincronizados com Chatwoot.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro na sincronização",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncChatwootMutation = useMutation({
    mutationFn: syncChatwootCustomAttributes,
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "✓ Chatwoot atualizado",
          description: "Custom attributes sincronizados com sucesso.",
        });
      }
    },
    onError: (error: Error) => {
      // Não mostrar erro no toast - apenas logar
      console.error("Erro ao sincronizar com Chatwoot:", error);
    },
  });

  return {
    syncOptions: syncOptionsMutation.mutate,
    isSyncing: syncOptionsMutation.isPending,
    syncChatwoot: async (payload: SyncChatwootPayload) => {
      try {
        await syncChatwootMutation.mutateAsync(payload);
      } catch (error) {
        // Silenciosamente falhar - já logado no console
        console.error("Sync falhou mas continuando:", error);
      }
    },
    isSyncingChatwoot: syncChatwootMutation.isPending,
  };
};
