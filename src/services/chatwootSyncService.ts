import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';

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

/**
 * Sincroniza card a partir do Chatwoot (puxar dados)
 */
export const syncCardFromChatwoot = async (
  cardId: string,
  conversationId: number
): Promise<boolean> => {
  try {
    console.log('[Chatwoot Sync] Sincronizando card:', cardId, 'conv:', conversationId);

    const { data, error } = await supabase.functions.invoke('sync-chatwoot-completo', {
      body: { conversation_id: conversationId, card_id: cardId }
    });

    if (error) throw error;

    // Verificar se temos atributos customizados
    const customAttributes = data?.custom_attributes;
    
    if (customAttributes) {
      // Atualizar atributo agendar_foilowup se existir (nome exato do atributo)
      if (customAttributes.agendar_foilowup) {
        // Criar/atualizar atividade de follow-up
        const followupText = customAttributes.agendar_foilowup;
        const dataRetorno = customAttributes.data_retorno 
          ? new Date(customAttributes.data_retorno)
          : new Date(Date.now() + 7 * 86400000); // 7 dias padrão

        await supabase.from('atividades_cards').upsert({
          card_id: cardId,
          tipo: 'Ligação', // Tipo padrão
          descricao: followupText,
          data_prevista: dataRetorno.toISOString(),
          status: 'pendente',
        }, {
          onConflict: 'card_id,tipo,data_prevista',
        });

        toast.success('Follow-up sincronizado do Chatwoot!');
      }

      // Atualizar tags/funil se houver
      if (data.tags) {
        console.log('[Chatwoot Sync] Tags:', data.tags);
      }

      return true;
    }

    toast.success('Card atualizado do Chatwoot!');
    return true;
  } catch (error) {
    console.error('[Chatwoot Sync] Erro:', error);
    toast.error('Erro ao sincronizar com Chatwoot');
    return false;
  }
};
