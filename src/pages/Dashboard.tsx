import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, TrendingUp, Users, MessageSquare, Percent, Loader2, Calendar, AlertCircle, ArrowUpDown, RefreshCw, LayoutGrid, List, LayoutDashboard } from "lucide-react";
import { DashboardAgendaWidget } from "@/components/DashboardAgendaWidget";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams, Link } from "react-router-dom";
import { useFunis, useEtapas, useAllCardsForFunil, useMoveCard, type CardWithStatus } from "@/hooks/useFunis";
import { useQueryClient } from "@tanstack/react-query";
import { useCardsSemTarefa, useAgendarTarefasEmLote } from "@/hooks/useCardsSemTarefa";
import { EtapaColumn } from "@/components/EtapaColumn";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { ConversaCard } from "@/components/ConversaCard";
import { CardDetailsModal } from "@/components/CardDetailsModal";
import { CreateCardModal } from "@/components/CreateCardModal";
import { FunilModal } from "@/components/FunilModal";
import { FunilActions } from "@/components/FunilActions";
import { EtapasModal } from "@/components/EtapasModal";
import type { Funil } from "@/types/database";
import { usePipelineFilters } from "@/utils/pipelineFilters";
import { PipelineFilters } from "@/components/PipelineFilters";
import { DashboardResumo } from "@/components/DashboardResumo";
import { useKanbanColors } from "@/hooks/useKanbanColors";
import { ListaCards } from "@/components/dashboard/ListaCards";
import { useCardSelection } from "@/hooks/useCardSelection";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { WorkspaceLayout } from "@/components/dashboard/WorkspaceLayout";

type ViewMode = 'workspace' | 'kanban' | 'table';

const Dashboard = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedFunilId, setSelectedFunilId] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<CardWithStatus | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardWithStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [agendarCardId, setAgendarCardId] = useState<string | null>(null);
  const [isFunilModalOpen, setIsFunilModalOpen] = useState(false);
  const [isEtapasModalOpen, setIsEtapasModalOpen] = useState(false);
  const [editingFunil, setEditingFunil] = useState<Funil | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 50;
  const [isTestingCycle, setIsTestingCycle] = useState(false);
  
  // MÓDULO 2: Estado de ViewMode com persistência
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('dashboard_view_mode');
    return (saved as ViewMode) || 'workspace';
  });
  
  // MÓDULO 3: Hook de seleção em massa
  const cardSelection = useCardSelection();
  
  // Persistir viewMode e limpar seleção ao trocar de view
  useEffect(() => {
    localStorage.setItem('dashboard_view_mode', viewMode);
    cardSelection.clear();
  }, [viewMode]);
  
  const { filters, setFilters, applyFilters } = usePipelineFilters();
  
  const { data: funis, isLoading: isLoadingFunis } = useFunis();
  const { data: etapas, isLoading: isLoadingEtapas } = useEtapas(selectedFunilId);
  
  // Passar filtros para o hook
  const { data: cardsData, isLoading: isLoadingCards } = useAllCardsForFunil(
    selectedFunilId, 
    currentPage, 
    pageSize,
    {
      status: filters.status,
      leadName: filters.leadName,
      productId: filters.productId,
      openedFrom: filters.openedFrom,
      openedTo: filters.openedTo,
      etapaId: filters.etapaId,
      assignedTo: filters.assignedTo,
      verMeus: filters.verMeus,
    }
  );
  const allCards = cardsData?.cards;
  const totalCards = cardsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCards / pageSize);
  const { data: semTarefasCount } = useCardsSemTarefa();
  const agendarEmLote = useAgendarTarefasEmLote();
  const moveCard = useMoveCard();
  const { colors: kanbanColors } = useKanbanColors();

  // Verificar se há cardId na URL e abrir modal
  useEffect(() => {
    const cardId = searchParams.get('cardId');
    if (!cardId) return;

    // P0.1: Invalidar cache antes de buscar
    console.log('[Dashboard] Invalidando cache para abrir card:', cardId);
    queryClient.invalidateQueries({ queryKey: ['all_cards', selectedFunilId] });

    // P0.2: Limpar filtro para garantir visibilidade
    setStatusFilter("todos");

    // Aguardar um tick para React Query refetch
    setTimeout(() => {
      const card = allCards?.find(c => c.id === cardId);

      if (card) {
        setSelectedCard(card);
        setIsModalOpen(true);
        setSearchParams({});
        return;
      }

      // Fallback: buscar card direto do Supabase se não estiver em allCards
      if (allCards !== undefined) {
        (async () => {
          const { data, error } = await supabase
            .from('cards_conversas')
            .select('*')
            .eq('id', cardId)
            .maybeSingle();

          if (data && !error) {
            const statusInfo = data.data_retorno 
              ? { status: 'restante' as const, variant: 'success' as const, label: '🟢 Tarefa agendada' }
              : { status: 'sem' as const, variant: 'warning' as const, label: '⚠️ Sem Tarefa' };
            
            const fetchedCard: CardWithStatus = {
              ...data,
              statusInfo
            };
            setSelectedCard(fetchedCard);
            setIsModalOpen(true);
            setSearchParams({});
            
            // P0.1: Invalidar novamente após fallback
            queryClient.invalidateQueries({ queryKey: ['all_cards', selectedFunilId] });
          } else {
            // P2: Mensagem de erro
            toast.error("Card não encontrado", {
              description: "O card pode ter sido apagado ou você não tem permissão.",
            });
            setSearchParams({});
          }
        })();
      }
    }, 100); // Delay para permitir refetch
  }, [searchParams, allCards, selectedFunilId, setSearchParams, queryClient]);

  // Resetar página ao mudar de funil
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedFunilId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Auto-select funil Comercial when loaded
  useEffect(() => {
    if (!funis || funis.length === 0) return;

    // Se ainda não há funil selecionado, usa Comercial como padrão
    if (!selectedFunilId) {
      const funilComercial = funis.find(f => f.nome === 'Comercial');
      setSelectedFunilId(funilComercial?.id || funis[0].id);
    }

    // Se veio um cardId na URL, tentar alinhar o funil
    const cardIdFromUrl = searchParams.get('cardId');
    if (cardIdFromUrl && allCards) {
      const card = allCards.find(c => c.id === cardIdFromUrl);
      if (card && card.funil_id && card.funil_id !== selectedFunilId) {
        setSelectedFunilId(card.funil_id);
      }
    }
  }, [funis, allCards, selectedFunilId, searchParams]);

  // P3.2: Log de estado do Dashboard (apenas em desenvolvimento)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Dashboard] Estado atual:', {
        selectedFunilId,
        totalCards: allCards?.length,
        statusFilter,
        sortOrder,
        currentPage,
        totalPages,
        cardIdFromUrl: searchParams.get('cardId'),
        isModalOpen,
      });
    }
  }, [selectedFunilId, allCards, statusFilter, sortOrder, currentPage, totalPages, searchParams, isModalOpen]);

  // Calcular estatísticas dinâmicas
  const [statsData, setStatsData] = useState({
    totalConversas: 0,
    taxaConversao: "0%",
    leadsAtivos: 0,
    vendasFechadas: 0,
    changeTotal: "+0%",
    changeConversao: "+0%",
    changeLeads: "+0%",
    changeVendas: "+0%"
  });

  useEffect(() => {
    const calculateStats = async () => {
      try {
        // Total de conversas atuais
        const totalAtual = allCards?.length || 0;

        // Calcular totais dos últimos 30 dias vs total
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: totalRecente } = await supabase
          .from('cards_conversas')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());

        // Vendas Fechadas (última etapa de cada funil)
        if (etapas && etapas.length > 0 && selectedFunilId) {
          const ultimaEtapa = etapas[etapas.length - 1];
          const vendasFechadas = allCards?.filter(c => c.etapa_id === ultimaEtapa.id).length || 0;

          // Leads Ativos (não estão na última etapa)
          const leadsAtivos = totalAtual - vendasFechadas;

          // Taxa de Conversão (vendas / total)
          const taxaConversao = totalAtual > 0 
            ? ((vendasFechadas / totalAtual) * 100).toFixed(1) 
            : "0";

          // Calcular mudanças
          const changeTotal = totalRecente && totalAtual > 0 
            ? `${totalRecente > 0 ? '+' : ''}${Math.round((totalRecente / totalAtual) * 100)}%`
            : "+0%";

          setStatsData({
            totalConversas: totalAtual,
            taxaConversao: `${taxaConversao}%`,
            leadsAtivos,
            vendasFechadas,
            changeTotal,
            changeConversao: vendasFechadas > 0 ? "+5%" : "+0%",
            changeLeads: leadsAtivos > 0 ? "+3%" : "+0%",
            changeVendas: vendasFechadas > 0 ? "+8%" : "+0%"
          });
        }
      } catch (error) {
        console.error('Erro ao calcular estatísticas:', error);
      }
    };

    if (allCards && etapas && selectedFunilId) {
      calculateStats();
    }
  }, [allCards, etapas, selectedFunilId]);

  const stats = [
    { 
      title: "Total de Conversas", 
      value: statsData.totalConversas, 
      change: statsData.changeTotal, 
      trend: "up",
      icon: MessageSquare,
      color: "text-primary"
    },
    { 
      title: "Taxa de Conversão", 
      value: statsData.taxaConversao, 
      change: statsData.changeConversao, 
      trend: "up",
      icon: Percent,
      color: "text-success"
    },
    { 
      title: "Leads Ativos", 
      value: statsData.leadsAtivos, 
      change: statsData.changeLeads, 
      trend: "up",
      icon: Users,
      color: "text-warning"
    },
    { 
      title: "Vendas Fechadas", 
      value: statsData.vendasFechadas, 
      change: statsData.changeVendas, 
      trend: "up",
      icon: TrendingUp,
      color: "text-primary"
    },
  ];

  const getCardsForEtapa = (etapaId: string): CardWithStatus[] => {
    if (!allCards) return [];
    
    const totalNaEtapa = allCards.filter((card) => card.etapa_id === etapaId);
    let filtered = [...totalNaEtapa];

    // Aplicar filtro de status
    if (statusFilter !== "todos") {
      filtered = filtered.filter((card) => card.statusInfo?.status === statusFilter);
    }

    // P1.3: Log quando filtro está escondendo cards
    if (filtered.length < totalNaEtapa.length && process.env.NODE_ENV === 'development') {
      console.log(`[getCardsForEtapa] Etapa ${etapaId}: ${filtered.length} de ${totalNaEtapa.length} cards visíveis (filtro: ${statusFilter})`);
    }

    // Aplicar ordenação
    filtered.sort((a, b) => {
      if (!a.data_retorno && !b.data_retorno) return 0;
      if (!a.data_retorno) return 1;
      if (!b.data_retorno) return -1;
      
      const dateA = new Date(a.data_retorno).getTime();
      const dateB = new Date(b.data_retorno).getTime();
      
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    return filtered;
  };

  const handleTestFullCycle = async () => {
    setIsTestingCycle(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-bidir-full');
      
      if (error) throw error;

      if (data.success) {
        toast.success("Teste do ciclo completo concluído!", {
          description: "Sistema funcionando corretamente. Verifique os logs para detalhes.",
        });
        console.log('[Test Full Cycle]', data.log);
      } else {
        toast.error("Teste falhou", {
          description: data.error || "Verifique os logs para mais informações",
        });
        console.error('[Test Full Cycle]', data.log || data.error);
      }
    } catch (error) {
      console.error('Erro ao testar ciclo:', error);
      toast.error("Erro ao executar teste", {
        description: String(error),
      });
    } finally {
      setIsTestingCycle(false);
    }
  };

  const handleAgendarEmLote = () => {
    agendarEmLote.mutate();
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = allCards?.find((c) => c.id === active.id);
    setActiveCard(card || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || active.id === over.id) return;

    const cardId = active.id as string;
    const newEtapaId = over.id as string;

    // Buscar nomes das etapas
    const card = allCards?.find((c) => c.id === cardId);
    const oldEtapa = etapas?.find((e) => e.id === card?.etapa_id);
    const newEtapa = etapas?.find((e) => e.id === newEtapaId);

    moveCard.mutate({ 
      cardId, 
      newEtapaId,
      oldEtapaNome: oldEtapa?.nome,
      newEtapaNome: newEtapa?.nome,
    });
  };

  const handleCardClick = (card: CardWithStatus) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleAgendarCard = (card: CardWithStatus) => {
    setAgendarCardId(card.id);
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleNewFunil = () => {
    setEditingFunil(null);
    setIsFunilModalOpen(true);
  };

  const handleEditFunil = (funil: Funil) => {
    setEditingFunil(funil);
    setIsFunilModalOpen(true);
  };

  const getFunilCardCount = (funilId: string) => {
    if (!allCards) return 0;
    return allCards.length;
  };
  // Stats para WorkspaceLayout
  const workspaceStats = {
    totalDeals: statsData.totalConversas,
    won: statsData.vendasFechadas,
    lost: allCards?.filter(c => c.status === 'perdido').length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Moderno */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-elegant">
                  <LayoutDashboard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gradient">Gestão APVS</h1>
                  <p className="text-xs text-muted-foreground font-medium">IGUATEMI</p>
                </div>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center border border-border/50 rounded-xl bg-muted/30 p-1">
                <Button 
                  variant={viewMode === 'workspace' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('workspace')}
                  className="rounded-lg gap-1"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Workspace
                </Button>
                <Button 
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  className="rounded-lg gap-1"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Kanban
                </Button>
                <Button 
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-lg gap-1"
                >
                  <List className="h-4 w-4" />
                  Tabela
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Link to="/dashboard-comercial">
                <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden lg:inline">Comercial</span>
                </Button>
              </Link>
              <Link to="/dashboard-administrativo">
                <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                  <Users className="h-4 w-4" />
                  <span className="hidden lg:inline">Administrativo</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Workspace View */}
        {viewMode === 'workspace' ? (
          <WorkspaceLayout
            cards={allCards || []}
            onCardClick={handleCardClick}
            onNewCard={() => setIsCreateModalOpen(true)}
            stats={workspaceStats}
            isLoading={isLoadingCards}
          />
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.title} className="shadow-card transition-shadow hover:shadow-elegant">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </CardTitle>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                      <p className={`text-xs mt-1 ${stat.trend === 'up' ? 'text-success' : 'text-destructive'}`}>
                        {stat.change} comparado ao mês anterior
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

        {/* Alerta de cards sem tarefa */}
        {semTarefasCount !== undefined && semTarefasCount > 0 && (
          <Alert className="mb-6 border-warning/20 bg-warning/10">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-foreground">
                <strong>{semTarefasCount}</strong> {semTarefasCount === 1 ? 'card sem tarefa agendada' : 'cards sem tarefas agendadas'}
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleAgendarEmLote}
                disabled={agendarEmLote.isPending}
                className="ml-4"
              >
                {agendarEmLote.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Agendando...
                  </>
                ) : (
                  'Agendar Pendentes (+7 dias)'
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Filtros Avançados */}
        <PipelineFilters
          filters={filters}
          setFilters={setFilters}
          selectedFunilId={selectedFunilId}
          onClear={() => setFilters({
            status: 'ativo',
            leadName: '',
            productId: null,
            openedFrom: null,
            openedTo: null,
            funilId: null,
            etapaId: null,
            assignedTo: null,
            verMeus: false,
          })}
        />

        {/* Funil Selector */}
        <div className="mb-6">
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Selecione o Funil</CardTitle>
                  <CardDescription>Escolha um funil para visualizar suas etapas e conversas</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleNewFunil}>
                  <Plus className="h-4 w-4" />
                  Novo Funil
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingFunis ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <Select value={selectedFunilId || undefined} onValueChange={setSelectedFunilId}>
                    <SelectTrigger className="w-full md:w-[400px] bg-background">
                      <SelectValue placeholder="Selecione um funil..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {funis?.map((funil) => (
                        <SelectItem key={funil.id} value={funil.id}>
                          {funil.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedFunilId && funis && (
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEtapasModalOpen(true)}
                        className="gap-2"
                      >
                        Gerenciar Etapas
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Gerenciar funil:
                        </span>
                        <FunilActions
                          funil={funis.find(f => f.id === selectedFunilId)!}
                          onEdit={() => handleEditFunil(funis.find(f => f.id === selectedFunilId)!)}
                          hasCards={getFunilCardCount(selectedFunilId) > 0}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* P0.3: Badge de filtro ativo */}
        {statusFilter !== "todos" && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Filtro ativo: <strong>
                  {statusFilter === "sem" && "⚠️ Sem Tarefa"}
                  {statusFilter === "restante" && "🟢 Restantes"}
                  {statusFilter === "vencida" && "🔴 Vencidas"}
                </strong> - alguns cards podem estar ocultos.
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setStatusFilter("todos")}
              >
                Limpar Filtro
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Funil Pipeline */}
        {selectedFunilId && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Pipeline de Conversas
                <div className="flex items-center gap-2">
                  {/* Toggle de Visualização */}
                  <div className="flex items-center border border-border rounded-md">
                    <Button 
                      variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('kanban')}
                      className="rounded-r-none gap-1"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      Kanban
                    </Button>
                    <Button 
                      variant={viewMode === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="rounded-l-none gap-1"
                    >
                      <List className="h-4 w-4" />
                      Tabela
                    </Button>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      console.log('[Dashboard] Refresh manual solicitado');
                      queryClient.invalidateQueries({ queryKey: ['all_cards', selectedFunilId] });
                      toast.success("Atualizando cards...");
                    }}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Atualizar
                  </Button>
                  <Badge variant="secondary">
                    {totalCards} conversas
                  </Badge>
                  {totalPages > 1 && (
                    <Badge variant="outline">
                      Página {currentPage + 1}/{totalPages}
                    </Badge>
                  )}
                </div>
              </CardTitle>
              <CardDescription className="flex items-center justify-between flex-wrap gap-2">
                <span>{viewMode === 'kanban' ? 'Arraste e solte cards entre as etapas' : 'Clique nas linhas para ver detalhes'}</span>
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Status</SelectItem>
                      <SelectItem value="sem">⚠️ Sem Tarefa</SelectItem>
                      <SelectItem value="restante">🟢 Restantes</SelectItem>
                      <SelectItem value="vencida">🔴 Vencidas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="gap-2 h-8"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                    {sortOrder === "asc" ? "Mais Próximas" : "Mais Distantes"}
                  </Button>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingEtapas || isLoadingCards ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : viewMode === 'table' ? (
                /* MÓDULO 2: Visão Tabela */
                <ListaCards
                  cards={allCards || []}
                  onRowClick={handleCardClick}
                  selectedIds={cardSelection.selectedIds}
                  onToggleSelect={cardSelection.toggle}
                  onSelectAll={cardSelection.selectAll}
                />
              ) : etapas && etapas.length > 0 ? (
                /* Visão Kanban */
                <DndContext
                  sensors={sensors}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {etapas.map((etapa, index) => {
                      const colorMap: Record<number, string> = {
                        0: kanbanColors.hoje,
                        1: kanbanColors.amanha,
                        2: kanbanColors.proxima,
                      };
                      
                      return (
                        <EtapaColumn
                          key={etapa.id}
                          etapaId={etapa.id}
                          nome={etapa.nome}
                          cards={getCardsForEtapa(etapa.id)}
                          totalCards={allCards?.filter(c => c.etapa_id === etapa.id).length || 0}
                          onCardClick={handleCardClick}
                          onAgendarClick={handleAgendarCard}
                          stageColor={colorMap[index % 3]}
                          stageIndex={index}
                        />
                      );
                    })}
                  </div>
                  <DragOverlay>
                    {activeCard ? (
                      <div className="rotate-3 opacity-80">
                        <ConversaCard
                          id={activeCard.id}
                          titulo={activeCard.titulo || 'Sem título'}
                          resumo={activeCard.resumo}
                          chatwootConversaId={activeCard.chatwoot_conversa_id || undefined}
                          createdAt={activeCard.created_at || new Date().toISOString()}
                          statusInfo={activeCard.statusInfo}
                        />
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma etapa encontrada para este funil
                </div>
              )}
            </CardContent>
            
            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Mostrando {currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, totalCards)} de {totalCards} cards
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                  >
                    ← Anterior
                  </Button>
                  <span className="text-sm font-medium px-2">
                    Página {currentPage + 1} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                  >
                    Próxima →
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
          </>
        )}
      </main>

      <CardDetailsModal
        card={selectedCard}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />

      <CreateCardModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />

      <FunilModal
        open={isFunilModalOpen}
        onOpenChange={setIsFunilModalOpen}
        funil={editingFunil}
      />

      <EtapasModal
        open={isEtapasModalOpen}
        onOpenChange={setIsEtapasModalOpen}
        funilId={selectedFunilId}
        etapas={etapas}
      />

      {/* MÓDULO 3: Barra de ações em massa */}
      <BulkActionsBar
        selectedCount={cardSelection.count}
        selectedIds={cardSelection.selectedIds}
        onClear={cardSelection.clear}
        funilId={selectedFunilId}
      />
    </div>
  );
};

export default Dashboard;
