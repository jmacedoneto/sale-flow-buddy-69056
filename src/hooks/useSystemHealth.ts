import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface SystemHealth {
  id: string;
  service: string;
  status: 'operational' | 'degraded' | 'offline';
  last_checked: string;
  error_message?: string;
  response_time_ms?: number;
}

/**
 * Hook para monitorar status de serviços externos com Realtime
 */
export const useSystemHealth = (service?: string) => {
  const query = useQuery<SystemHealth[], Error>({
    queryKey: ['system-health', service],
    queryFn: async () => {
      let query = supabase
        .from('system_health')
        .select('*')
        .order('service');

      if (service) {
        query = query.eq('service', service);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as SystemHealth[];
    },
    refetchInterval: 30000, // Refetch a cada 30s
  });

  // Subscribe para updates em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('system-health-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_health',
          filter: service ? `service=eq.${service}` : undefined,
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [service, query]);

  return query;
};

/**
 * Hook simplificado para obter status do Chatwoot
 */
export const useChatwootHealth = () => {
  const { data, ...rest } = useSystemHealth('chatwoot');
  return {
    health: data?.[0],
    ...rest,
  };
};
