import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hook para monitorar erros em tempo real nos logs de webhook
 * Mostra toast para admins quando há erros recentes (últimos 5 min)
 */
export const useRealtimeErrorAlerts = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Verificar se é admin/master (pode ajustar conforme necessário)
    const checkUserRole = async () => {
      const { data } = await supabase
        .from('users_crm')
        .select('role')
        .eq('email', user.email)
        .single();

      // Apenas mostrar alertas para master/admin
      if (!data || !['master', 'admin'].includes(data.role)) {
        return;
      }

      // Subscribe para novos logs de erro
      const channel = supabase
        .channel('error-alerts')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'webhook_sync_logs',
            filter: 'status=eq.error',
          },
          (payload) => {
            const log: any = payload.new;
            const errorTime = new Date(log.created_at);
            const now = new Date();
            const diffMinutes = (now.getTime() - errorTime.getTime()) / (1000 * 60);

            // Apenas alertar sobre erros recentes (últimos 5 minutos)
            if (diffMinutes <= 5) {
              toast.error('Erro de Sincronização Detectado', {
                description: `Tipo: ${log.sync_type} | Conversa: ${log.conversation_id || 'N/A'}`,
                action: {
                  label: 'Ver Logs',
                  onClick: () => {
                    window.location.href = '/configuracoes?tab=monitoramento';
                  },
                },
                duration: 10000,
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    checkUserRole();
  }, [user]);
};
