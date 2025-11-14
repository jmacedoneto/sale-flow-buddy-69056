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
 * Testa a conexão com o Chatwoot (SRP: responsável apenas por chamar a edge function)
 * 
 * @param url - URL base do Chatwoot
 * @param accountId - Account ID no Chatwoot
 * @param apiKey - API Key do Chatwoot
 * @returns Resultado do teste com status normalizado
 */
export const testChatwootConnection = async (
  url: string,
  accountId: number,
  apiKey: string
): Promise<{
  ok: boolean;
  status: 'ok' | 'auth_error' | 'network_error' | 'not_found' | 'unknown' | 'missing_url' | 'missing_account_id' | 'missing_api_key';
  http_status?: number;
  message: string;
  conversation_count?: number;
  details?: string;
}> => {
  const { data, error } = await supabase.functions.invoke('chatwoot-test-connection', {
    body: { url, account_id: accountId, api_key: apiKey },
  });
  
  if (error) {
    console.error('[chatwootConfigService] Erro ao invocar edge function:', error);
    throw error;
  }
  
  return data;
};
