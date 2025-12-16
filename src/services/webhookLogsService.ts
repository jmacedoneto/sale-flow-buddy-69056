import { supabase } from "@/integrations/supabase/client";

export interface WebhookLog {
  id: string;
  sync_type: 'chatwoot_to_lovable' | 'lovable_to_chatwoot';
  conversation_id: number | null;
  card_id: string | null;
  status: 'success' | 'error' | 'warning';
  event_type: string | null;
  payload: any;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
}

export interface WebhookStats {
  total_syncs: number;
  success_count: number;
  error_count: number;
  warning_count: number;
  avg_latency_ms: number;
  last_24h_count: number;
  chatwoot_to_lovable_count: number;
  lovable_to_chatwoot_count: number;
}

/**
 * Busca logs de webhooks com paginação e filtros
 */
export const getWebhookLogs = async (
  page: number = 0,
  pageSize: number = 50,
  filters?: {
    status?: 'success' | 'error' | 'warning';
    sync_type?: 'chatwoot_to_lovable' | 'lovable_to_chatwoot';
    hours?: number; // últimas X horas
  }
): Promise<{ logs: WebhookLog[]; totalCount: number }> => {
  let query = supabase
    .from('webhook_sync_logs')
    .select('*', { count: 'exact' });

  // Aplicar filtros
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.sync_type) {
    query = query.eq('sync_type', filters.sync_type);
  }

  if (filters?.hours) {
    const since = new Date();
    since.setHours(since.getHours() - filters.hours);
    query = query.gte('created_at', since.toISOString());
  }

  // Paginação e ordenação
  const start = page * pageSize;
  const end = start + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(start, end);

  if (error) throw error;

  return {
    logs: (data || []) as WebhookLog[],
    totalCount: count || 0,
  };
};

/**
 * Busca estatísticas gerais dos webhooks
 */
export const getWebhookStats = async (): Promise<WebhookStats> => {
  // Total de syncs
  const { count: total } = await supabase
    .from('webhook_sync_logs')
    .select('*', { count: 'exact', head: true });

  // Contagem por status
  const { count: successCount } = await supabase
    .from('webhook_sync_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'success');

  const { count: errorCount } = await supabase
    .from('webhook_sync_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'error');

  const { count: warningCount } = await supabase
    .from('webhook_sync_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'warning');

  // Últimas 24h
  const since24h = new Date();
  since24h.setHours(since24h.getHours() - 24);

  const { count: last24hCount } = await supabase
    .from('webhook_sync_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since24h.toISOString());

  // Contagem por tipo
  const { count: chatwootToLovable } = await supabase
    .from('webhook_sync_logs')
    .select('*', { count: 'exact', head: true })
    .eq('sync_type', 'chatwoot_to_lovable');

  const { count: lovableToChatwoot } = await supabase
    .from('webhook_sync_logs')
    .select('*', { count: 'exact', head: true })
    .eq('sync_type', 'lovable_to_chatwoot');

  // Latência média (apenas success)
  const { data: latencyData } = await supabase
    .from('webhook_sync_logs')
    .select('latency_ms')
    .eq('status', 'success')
    .not('latency_ms', 'is', null)
    .limit(100); // últimas 100 operações bem-sucedidas

  const avgLatency = latencyData && latencyData.length > 0
    ? latencyData.reduce((acc, log) => acc + (log.latency_ms || 0), 0) / latencyData.length
    : 0;

  return {
    total_syncs: total || 0,
    success_count: successCount || 0,
    error_count: errorCount || 0,
    warning_count: warningCount || 0,
    avg_latency_ms: Math.round(avgLatency),
    last_24h_count: last24hCount || 0,
    chatwoot_to_lovable_count: chatwootToLovable || 0,
    lovable_to_chatwoot_count: lovableToChatwoot || 0,
  };
};

/**
 * Limpa logs antigos (>X dias)
 */
export const cleanOldLogs = async (days: number = 30): Promise<number> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('webhook_sync_logs')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id');

  if (error) throw error;

  return data?.length || 0;
};

/**
 * Busca um log específico por ID
 */
export const getWebhookLogById = async (id: string): Promise<WebhookLog> => {
  const { data, error } = await supabase
    .from('webhook_sync_logs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Log não encontrado');

  return data as WebhookLog;
};
