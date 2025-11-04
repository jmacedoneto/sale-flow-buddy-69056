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
import { Plus, TrendingUp, Users, MessageSquare, Percent, Loader2, Calendar, AlertCircle, ArrowUpDown, TestTube2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams, Link } from "react-router-dom";
import { useFunis, useEtapas, useAllCardsForFunil, useMoveCard, type CardWithStatus } from "@/hooks/useFunis";
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

const Dashboard = () => {
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
  const [isTestingCycle, setIsTestingCycle] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 50;
  
  const { data: funis, isLoading: isLoadingFunis } = useFunis();
  const { data: etapas, isLoading: isLoadingEtapas } = useEtapas(selectedFunilId);
  const { data: cardsData, isLoading: isLoadingCards } = useAllCardsForFunil(selectedFunilId, currentPage, pageSize);
  const allCards = cardsData?.cards;
  const totalCards = cardsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCards / pageSize);
  const { data: semTarefasCount } = useCardsSemTarefa();
  const agendarEmLote = useAgendarTarefasEmLote();
  const moveCard = useMoveCard();

  // Verificar se há cardId na URL e abrir modal
  useEffect(() => {
    const cardId = searchParams.get('cardId');
    if (cardId && allCards) {
      const card = allCards.find(c => c.id === cardId);
      if (card) {
        setSelectedCard(card);
        setIsModalOpen(true);
        // Limpar o parâmetro da URL
        setSearchParams({});
      }
    }
  }, [searchParams, allCards, setSearchParams]);

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

  // Auto-select first funil when loaded
  if (funis && funis.length > 0 && !selectedFunilId) {
    setSelectedFunilId(funis[0].id);
  }

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
    
    let filtered = allCards.filter((card) => card.etapa_id === etapaId);

    // Aplicar filtro de status
    if (statusFilter !== "todos") {
      filtered = filtered.filter((card) => card.statusInfo?.status === statusFilter);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard CRM - Home</h1>
              <p className="text-sm text-muted-foreground mt-1">Escolha um dashboard para visualizar</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Dashboard Selection Cards */}
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          <Link to="/dashboard-comercial">
            <Card className="hover:shadow-elegant transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Dashboard Comercial
                </CardTitle>
                <CardDescription>
                  Visualize métricas e análises do funil de vendas Comercial
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Acompanhe conversões, distribuição de leads e performance das etapas do funil comercial.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/dashboard-administrativo">
            <Card className="hover:shadow-elegant transition-shadow cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Users className="h-5 w-5 text-primary" />
                  Dashboard Administrativo
                </CardTitle>
                <CardDescription>
                  Visualize métricas dos funis administrativos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Acompanhe demandas de Eventos, Suporte e outras operações administrativas.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>

      <main className="container mx-auto px-6 py-8">
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

        {/* Funil Pipeline */}
        {selectedFunilId && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Pipeline de Conversas
                <div className="flex items-center gap-2">
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
                <span>Arraste e solte cards entre as etapas para atualizar o status</span>
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
              ) : etapas && etapas.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {etapas.map((etapa) => (
                      <EtapaColumn
                        key={etapa.id}
                        etapaId={etapa.id}
                        nome={etapa.nome}
                        cards={getCardsForEtapa(etapa.id)}
                        onCardClick={handleCardClick}
                        onAgendarClick={handleAgendarCard}
                      />
                    ))}
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
    </div>
  );
};

export default Dashboard;
