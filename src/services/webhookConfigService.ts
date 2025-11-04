import { supabase } from "@/integrations/supabase/client";

export interface WebhookConfig {
  id: string;
  name: string;
  url: string | null;
  inbox_path: string;
  events: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookConfigInput {
  name: string;
  url?: string;
  inbox_path: string;
  events: string[];
  active?: boolean;
}

/**
 * Lista todas as configurações de webhook
 */
export const listWebhookConfigs = async (): Promise<WebhookConfig[]> => {
  const { data, error } = await supabase
    .from('webhooks_config')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

/**
 * Cria uma nova configuração de webhook
 */
export const createWebhookConfig = async (config: WebhookConfigInput): Promise<WebhookConfig> => {
  const { data, error } = await supabase
    .from('webhooks_config')
    .insert(config)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

/**
 * Atualiza uma configuração de webhook existente
 */
export const updateWebhookConfig = async (
  id: string,
  updates: Partial<WebhookConfigInput>
): Promise<WebhookConfig> => {
  const { data, error } = await supabase
    .from('webhooks_config')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

/**
 * Deleta uma configuração de webhook
 */
export const deleteWebhookConfig = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('webhooks_config')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

/**
 * Gera URL completa do webhook para Supabase
 */
export const generateWebhookUrl = (inboxPath: string): string => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'sjrmpojssvfgquroywys';
  // Remove leading slash if present
  const cleanPath = inboxPath.startsWith('/') ? inboxPath.substring(1) : inboxPath;
  return `https://${projectId}.supabase.co/functions/v1/dispatcher-multi/${encodeURIComponent(cleanPath)}`;
};
