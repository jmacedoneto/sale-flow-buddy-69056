import { supabase } from "@/integrations/supabase/client";

export interface Webhook {
  id: string;
  nome: string;
  evento_chatwoot: string;
  acao: string;
  config_adicional?: any;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookInput {
  nome: string;
  evento_chatwoot: string;
  acao: string;
  config_adicional?: any;
  ativo?: boolean;
}

/**
 * Lista todos os webhooks
 */
export const listWebhooks = async (): Promise<Webhook[]> => {
  const { data, error } = await supabase.functions.invoke('list-webhooks');
  
  if (error) throw error;
  return data.webhooks || [];
};

/**
 * Cria um novo webhook
 */
export const createWebhook = async (webhook: WebhookInput): Promise<Webhook> => {
  const { data, error } = await supabase.functions.invoke('create-webhook', {
    body: webhook,
  });
  
  if (error) throw error;
  if (!data.success) throw new Error(data.error || 'Erro ao criar webhook');
  return data.webhook;
};

/**
 * Atualiza um webhook existente
 */
export const updateWebhook = async (
  webhookId: string,
  updates: Partial<WebhookInput>
): Promise<Webhook> => {
  const { data, error } = await supabase.functions.invoke('update-webhook', {
    body: { webhook_id: webhookId, ...updates },
  });
  
  if (error) throw error;
  if (!data.success) throw new Error(data.error || 'Erro ao atualizar webhook');
  return data.webhook;
};

/**
 * Deleta um webhook
 */
export const deleteWebhook = async (webhookId: string): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('delete-webhook', {
    body: { webhook_id: webhookId },
  });
  
  if (error) throw error;
  if (!data.success) throw new Error(data.error || 'Erro ao deletar webhook');
};
