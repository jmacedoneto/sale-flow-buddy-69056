import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { isToday, isBefore, startOfDay } from "date-fns";

/**
 * GRUPO C.3: Widget de resumo de agenda do usuário no Dashboard
 */
export const DashboardAgendaWidget = () => {
  const { data: atividades = [], isLoading } = useQuery({
    queryKey: ['dashboard-agenda'],
    queryFn: async () => {
      const { data } = await supabase
        .from('atividades_cards')
        .select(`
          *,
          cards_conversas!inner(titulo, chatwoot_conversa_id)
        `)
        .eq('status', 'pendente')
        .not('data_prevista', 'is', null)
        .order('data_prevista', { ascending: true })
        .limit(5);
      
      return data || [];
    },
    refetchInterval: 60000, // Refresh a cada 1 minuto
  });

  const hoje = startOfDay(new Date());
  const vencidas = atividades.filter(a => a.data_prevista && isBefore(startOfDay(new Date(a.data_prevista)), hoje));
  const deHoje = atividades.filter(a => a.data_prevista && isToday(new Date(a.data_prevista)));
  const proximasDias = atividades.filter(a => 
    a.data_prevista && 
    !isBefore(startOfDay(new Date(a.data_prevista)), hoje) &&
    !isToday(new Date(a.data_prevista))
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/30 border border-border/50 rounded-lg">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm">Carregando agenda...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-muted/30 border border-border/50 rounded-lg">
      {/* Título e resumo compacto */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Agenda</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {vencidas.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive rounded">
              {vencidas.length} vencida{vencidas.length > 1 ? 's' : ''}
            </span>
          )}
          {deHoje.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded">
              {deHoje.length} hoje
            </span>
          )}
          {proximasDias.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded">
              {proximasDias.length} próxima{proximasDias.length > 1 ? 's' : ''}
            </span>
          )}
          {atividades.length === 0 && (
            <span className="text-muted-foreground">Nenhuma pendente</span>
          )}
        </div>
      </div>

      {/* Link discreto */}
      <Link to="/atividades">
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1">
          Ver todas
          <ChevronRight className="h-3 w-3" />
        </Button>
      </Link>
    </div>
  );
};