import { supabase } from "@/integrations/supabase/client";

export interface ChatwootConfig {
  id?: string;
  url: string;
  account_id: number;
  label: string;
  status?: string;
  updated_at?: string;
}

export interface ChatwootConfigInput {
  url: string;
  account_id: number;
  label: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  conversation_count?: number;
  details?: string;
}

/**
 * Busca a configuração atual do Chatwoot
 */
export const getChatwootConfig = async (): Promise<ChatwootConfig | null> => {
  const { data, error } = await supabase.functions.invoke('get-chatwoot-config');
  
  if (error) throw error;
  return data.config;
};

/**
 * Salva a configuração do Chatwoot
 */
export const saveChatwootConfig = async (config: ChatwootConfigInput): Promise<void> => {
  const { data, error } = await supabase.functions.invoke('save-chatwoot-config', {
    body: config,
  });
  
  if (error) throw error;
  if (!data.success) throw new Error(data.error || 'Erro ao salvar configuração');
};

/**
 * Testa a conexão com o Chatwoot
 * Nota: API Key é lida do ambiente CHATWOOT_API_KEY
 */
export const testChatwootConnection = async (
  config: ChatwootConfigInput
): Promise<TestConnectionResponse> => {
  const { data, error } = await supabase.functions.invoke('test-chatwoot-connection', {
    body: config,
  });
  
  if (error) throw error;
  return data;
};
