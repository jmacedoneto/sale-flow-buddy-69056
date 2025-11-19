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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Minha Agenda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 bg-destructive/10 rounded-lg">
            <div className="text-2xl font-bold text-destructive">{vencidas.length}</div>
            <div className="text-xs text-muted-foreground">Vencidas</div>
          </div>
          <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{deHoje.length}</div>
            <div className="text-xs text-muted-foreground">Hoje</div>
          </div>
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">{proximasDias.length}</div>
            <div className="text-xs text-muted-foreground">Próximas</div>
          </div>
        </div>

        {/* Lista das 5 próximas */}
        {atividades.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Próximas Atividades</h4>
            {atividades.slice(0, 5).map(atividade => {
              const dataPrevista = atividade.data_prevista ? new Date(atividade.data_prevista) : null;
              const isVencida = dataPrevista && isBefore(startOfDay(dataPrevista), hoje);
              const isHoje = dataPrevista && isToday(dataPrevista);
              const isAmanha = dataPrevista && isTomorrow(dataPrevista);

              return (
                <div key={atividade.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{atividade.cards_conversas?.titulo}</p>
                    <p className="text-xs text-muted-foreground truncate">{atividade.descricao}</p>
                  </div>
                  <Badge 
                    variant={isVencida ? "destructive" : isHoje ? "default" : "secondary"}
                    className="ml-2 shrink-0"
                  >
                    {isVencida ? "Vencida" : isHoje ? "Hoje" : isAmanha ? "Amanhã" : 
                      dataPrevista ? format(dataPrevista, "dd/MM", { locale: ptBR }) : "-"}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma atividade pendente
          </p>
        )}

        {/* Link para página completa */}
        <Link to="/atividades">
          <Button variant="outline" className="w-full">
            Ver todas as atividades
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};