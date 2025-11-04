import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  type WebhookInput,
} from "@/services/webhookService";
import { toast } from "@/hooks/use-toast";

/**
 * Hook para gerenciar webhooks
 * Segue o princípio de separação de lógica de negócio da UI
 */
export const useWebhooks = () => {
  const queryClient = useQueryClient();

  // Query para listar webhooks
  const query = useQuery({
    queryKey: ['webhooks'],
    queryFn: listWebhooks,
    staleTime: 30000, // 30 segundos
  });

  // Mutation para criar webhook
  const createMutation = useMutation({
    mutationFn: createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: "✓ Webhook criado",
        description: "O webhook foi criado com sucesso.",
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

  // Mutation para atualizar webhook
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<WebhookInput> }) =>
      updateWebhook(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: "✓ Webhook atualizado",
        description: "O webhook foi atualizado com sucesso.",
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

  // Mutation para deletar webhook
  const deleteMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: "✓ Webhook deletado",
        description: "O webhook foi removido com sucesso.",
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
    webhooks: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createWebhook: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateWebhook: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteWebhook: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
};
