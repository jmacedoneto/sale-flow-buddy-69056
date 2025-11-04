import { supabase } from "@/integrations/supabase/client";

export interface SyncChatwootPayload {
  conversation_id: number;
  nome_do_funil: string;
  funil_etapa: string;
  data_retorno: string;
}

export interface SyncOptionsResponse {
  success: boolean;
  message: string;
  funis?: number;
  etapas?: number;
}

/**
 * Sincroniza custom attributes com o Chatwoot
 */
export const syncChatwootCustomAttributes = async (
  payload: SyncChatwootPayload
): Promise<{ success: boolean; message: string }> => {
  const { data, error } = await supabase.functions.invoke('sync-chatwoot', {
    body: payload,
  });
  
  if (error) throw error;
  return data;
};

/**
 * Sincroniza opções de funis e etapas com Chatwoot
 */
export const syncOptionsWithChatwoot = async (): Promise<SyncOptionsResponse> => {
  const { data, error } = await supabase.functions.invoke('init-sync-options');
  
  if (error) throw error;
  return data;
};
