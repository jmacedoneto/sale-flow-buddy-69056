import { supabase } from "@/integrations/supabase/client";

/**
 * Serviço para sincronização bidirecional CRM ↔ Chatwoot
 * Segue princípio SRP (Single Responsibility Principle)
 */

export interface SyncCardToChatwootParams {
  conversationId: number;
  label?: string; // nome do funil
  etapaComercial?: string; // nome da etapa
}

/**
 * Sincroniza mudanças do CRM → Chatwoot
 * Atualiza custom attributes da conversa no Chatwoot
 */
export const syncCardToChatwoot = async ({
  conversationId,
  label,
  etapaComercial,
}: SyncCardToChatwootParams): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    console.log('[cardSyncService] Sincronizando para Chatwoot:', {
      conversationId,
      label,
      etapaComercial,
    });

    const { data, error } = await supabase.functions.invoke('sync-card-to-chatwoot', {
      body: {
        conversation_id: conversationId,
        label,
        etapa_comercial: etapaComercial,
      },
    });

    if (error) {
      console.error('[cardSyncService] Erro ao sincronizar:', error);
      throw error;
    }

    console.log('[cardSyncService] Sync bem-sucedido:', data);
    return data;
  } catch (error) {
    console.error('[cardSyncService] Erro inesperado:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
};
