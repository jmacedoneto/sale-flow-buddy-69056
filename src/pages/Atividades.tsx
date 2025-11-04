import { useState, useMemo } from "react";
import { useCardsComPrazo } from "@/hooks/useCardsComPrazo";
import { CardAtividadeItem } from "@/components/CardAtividadeItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, AlertTriangle, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

type PrioridadeFiltro = "todas" | "baixa" | "media" | "alta" | "urgente";
type PeriodoFiltro = "todos" | "hoje" | "esta_semana" | "este_mes";

const Atividades = () => {
  const { data, isLoading, error } = useCardsComPrazo();
  const [searchTerm, setSearchTerm] = useState("");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<PrioridadeFiltro>("todas");
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>("todos");

  // Filtrar cards com base nos critérios
  const filteredData = useMemo(() => {
    if (!data) return null;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const filterCards = (cards: typeof data.paraVencer) => {
      return cards.filter(card => {
        // Filtro de busca
        const matchesSearch = !searchTerm || 
          card.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (card.resumo && card.resumo.toLowerCase().includes(searchTerm.toLowerCase()));

        // Filtro de prioridade
        const matchesPrioridade = prioridadeFiltro === "todas" || 
          card.prioridade === prioridadeFiltro;

        // Filtro de período
        let matchesPeriodo = true;
        if (card.prazo && periodoFiltro !== "todos") {
          const prazoDate = new Date(card.prazo);
          prazoDate.setHours(0, 0, 0, 0);
          const diffDays = differenceInDays(prazoDate, hoje);

          if (periodoFiltro === "hoje") {
            matchesPeriodo = diffDays === 0;
          } else if (periodoFiltro === "esta_semana") {
            matchesPeriodo = diffDays >= 0 && diffDays <= 7;
          } else if (periodoFiltro === "este_mes") {
            matchesPeriodo = diffDays >= 0 && diffDays <= 30;
          }
        }

        return matchesSearch && matchesPrioridade && matchesPeriodo;
      });
    };

    return {
      paraVencer: filterCards(data.paraVencer),
      vencidas: filterCards(data.vencidas),
    };
  }, [data, searchTerm, prioridadeFiltro, periodoFiltro]);

  // Contar dias restantes no total
  const diasRestantesInfo = useMemo(() => {
    if (!data) return { total: 0, proximos7Dias: 0 };

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const proximos7Dias = data.paraVencer.filter(card => {
      if (!card.prazo) return false;
      const prazoDate = new Date(card.prazo);
      prazoDate.setHours(0, 0, 0, 0);
      const diff = differenceInDays(prazoDate, hoje);
      return diff >= 0 && diff <= 7;
    }).length;

    return {
      total: data.paraVencer.length,
      proximos7Dias,
    };
  }, [data]);

  const clearFilters = () => {
    setSearchTerm("");
    setPrioridadeFiltro("todas");
    setPeriodoFiltro("todos");
  };

  const hasActiveFilters = searchTerm || prioridadeFiltro !== "todas" || periodoFiltro !== "todos";

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erro ao carregar atividades</h2>
            <p className="text-muted-foreground">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Painel de Atividades</h1>
                <p className="text-sm text-muted-foreground">
                  Acompanhe cards com prazos definidos
                </p>
              </div>
            </div>

            {data && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning"></div>
                  <span className="text-muted-foreground">
                    {diasRestantesInfo.proximos7Dias} próximos 7 dias
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span className="text-muted-foreground">
                    {filteredData?.paraVencer.length || 0} para vencer
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-destructive"></div>
                  <span className="text-muted-foreground">
                    {filteredData?.vencidas.length || 0} vencidas
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou resumo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>

            {/* Filter Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Prioridade:</span>
              {(["todas", "baixa", "media", "alta", "urgente"] as PrioridadeFiltro[]).map((p) => (
                <Badge
                  key={p}
                  variant={prioridadeFiltro === p ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    prioridadeFiltro === p && "shadow-sm"
                  )}
                  onClick={() => setPrioridadeFiltro(p)}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Badge>
              ))}

              <span className="text-sm text-muted-foreground ml-4">Período:</span>
              {(["todos", "hoje", "esta_semana", "este_mes"] as PeriodoFiltro[]).map((p) => {
                const labels = {
                  todos: "Todos",
                  hoje: "Hoje",
                  esta_semana: "Esta Semana",
                  este_mes: "Este Mês"
                };
                return (
                  <Badge
                    key={p}
                    variant={periodoFiltro === p ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-colors",
                      periodoFiltro === p && "shadow-sm"
                    )}
                    onClick={() => setPeriodoFiltro(p)}
                  >
                    {labels[p]}
                  </Badge>
                );
              })}

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2 ml-2"
                >
                  <X className="h-3 w-3" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Para Vencer */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Para Vencer</h2>
              {filteredData && (
                <span className="text-sm text-muted-foreground">
                  ({filteredData.paraVencer.length})
                </span>
              )}
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </>
              ) : filteredData && filteredData.paraVencer.length > 0 ? (
                filteredData.paraVencer.map((card) => (
                  <CardAtividadeItem key={card.id} card={card} />
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma atividade para vencer</p>
                  {hasActiveFilters && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={clearFilters}
                      className="mt-2"
                    >
                      Limpar filtros
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Vencidas */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="text-lg font-semibold text-foreground">Vencidas</h2>
              {filteredData && (
                <span className="text-sm text-muted-foreground">
                  ({filteredData.vencidas.length})
                </span>
              )}
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </>
              ) : filteredData && filteredData.vencidas.length > 0 ? (
                filteredData.vencidas.map((card) => (
                  <CardAtividadeItem key={card.id} card={card} isVencido />
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma atividade vencida</p>
                  {hasActiveFilters && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={clearFilters}
                      className="mt-2"
                    >
                      Limpar filtros
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Atividades;
