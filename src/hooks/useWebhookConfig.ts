import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  listWebhookConfigs, 
  createWebhookConfig, 
  updateWebhookConfig, 
  deleteWebhookConfig,
  type WebhookConfigInput 
} from "@/services/webhookConfigService";
import { toast } from "@/hooks/use-toast";

export const useWebhookConfig = () => {
  const queryClient = useQueryClient();

  const { data: configs = [], isLoading, error } = useQuery({
    queryKey: ['webhook-configs'],
    queryFn: listWebhookConfigs,
  });

  const createMutation = useMutation({
    mutationFn: createWebhookConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-configs'] });
      toast({
        title: "✓ Webhook criado",
        description: "Configuração de webhook salva com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro ao criar webhook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<WebhookConfigInput> }) =>
      updateWebhookConfig(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-configs'] });
      toast({
        title: "✓ Webhook atualizado",
        description: "Configuração de webhook atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro ao atualizar webhook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebhookConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-configs'] });
      toast({
        title: "✓ Webhook deletado",
        description: "Configuração de webhook removida com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro ao deletar webhook",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    configs,
    isLoading,
    error,
    createConfig: createMutation.mutate,
    updateConfig: updateMutation.mutate,
    deleteConfig: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
