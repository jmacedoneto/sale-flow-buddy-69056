import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { format, isToday, isTomorrow, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Minha Agenda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-6">
          {/* Título compacto */}
          <div className="flex items-center gap-2 shrink-0">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-semibold">Minha Agenda</span>
          </div>

          {/* Resumo horizontal compacto */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 rounded-md">
              <span className="text-lg font-bold text-destructive">{vencidas.length}</span>
              <span className="text-xs text-muted-foreground">Vencidas</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 rounded-md">
              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-500">{deHoje.length}</span>
              <span className="text-xs text-muted-foreground">Hoje</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-md">
              <span className="text-lg font-bold text-primary">{proximasDias.length}</span>
              <span className="text-xs text-muted-foreground">Próximas</span>
            </div>
          </div>

          {/* Próximas atividades em linha */}
          {atividades.length > 0 ? (
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
              {atividades.slice(0, 3).map(atividade => {
                const dataPrevista = atividade.data_prevista ? new Date(atividade.data_prevista) : null;
                const isVencida = dataPrevista && isBefore(startOfDay(dataPrevista), hoje);
                const isHoje = dataPrevista && isToday(dataPrevista);
                const isAmanha = dataPrevista && isTomorrow(dataPrevista);

                return (
                  <div key={atividade.id} className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md shrink-0">
                    <div className="flex flex-col min-w-0">
                      <p className="text-xs font-medium truncate max-w-[150px]">{atividade.cards_conversas?.titulo}</p>
                    </div>
                    <Badge 
                      variant={isVencida ? "destructive" : isHoje ? "default" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {isVencida ? "Vencida" : isHoje ? "Hoje" : isAmanha ? "Amanhã" : dataPrevista ? format(dataPrevista, "dd/MM", { locale: ptBR }) : ""}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground flex-1">Nenhuma atividade pendente</p>
          )}

          {/* Link para ver todas */}
          <Link to="/atividades" className="shrink-0">
            <Button variant="ghost" size="sm" className="gap-1">
              Ver todas
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};