import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, ArrowUpDown, RefreshCw, LayoutGrid, List, Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { useFunis, useEtapas, useAllCardsForFunil, useMoveCard, type CardWithStatus } from "@/hooks/useFunis";
import { useQueryClient } from "@tanstack/react-query";
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
import { useKanbanColors } from "@/hooks/useKanbanColors";
import { ListaCards } from "@/components/dashboard/ListaCards";
import { useCardSelection } from "@/hooks/useCardSelection";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { FiltersSidebar } from "@/components/FiltersSidebar";
import { cn } from "@/lib/utils";

type ViewMode = 'kanban' | 'table';

const Dashboard = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedFunilId, setSelectedFunilId] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<CardWithStatus | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardWithStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFunilModalOpen, setIsFunilModalOpen] = useState(false);
  const [isEtapasModalOpen, setIsEtapasModalOpen] = useState(false);
  const [editingFunil, setEditingFunil] = useState<Funil | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(() => {
    const saved = localStorage.getItem('dashboard_page_size');
    return saved ? parseInt(saved) : 50;
  });

  // Persistir pageSize
  useEffect(() => {
    localStorage.setItem('dashboard_page_size', pageSize.toString());
    setCurrentPage(0);
  }, [pageSize]);
  
  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('filters-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  // Estado de ViewMode com persistência
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('dashboard_view_mode');
    return (saved as ViewMode) === 'table' ? 'table' : 'kanban';
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
  const moveCard = useMoveCard();
  const { colors: kanbanColors } = useKanbanColors();

  // Verificar se há cardId na URL e abrir modal
  useEffect(() => {
    const cardId = searchParams.get('cardId');
    if (!cardId) return;

    queryClient.invalidateQueries({ queryKey: ['all_cards', selectedFunilId] });
    setStatusFilter("todos");

    setTimeout(() => {
      const card = allCards?.find(c => c.id === cardId);

      if (card) {
        setSelectedCard(card);
        setIsModalOpen(true);
        setSearchParams({});
        return;
      }

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
            queryClient.invalidateQueries({ queryKey: ['all_cards', selectedFunilId] });
          } else {
            toast.error("Card não encontrado", {
              description: "O card pode ter sido apagado ou você não tem permissão.",
            });
            setSearchParams({});
          }
        })();
      }
    }, 100);
  }, [searchParams, allCards, selectedFunilId, setSearchParams, queryClient]);

  // Resetar página ao mudar de funil
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedFunilId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // Aumentado para evitar conflitos com cliques
      },
    })
  );

  // Auto-select funil Comercial when loaded
  useEffect(() => {
    if (!funis || funis.length === 0) return;

    if (!selectedFunilId) {
      const funilComercial = funis.find(f => f.nome === 'Comercial');
      setSelectedFunilId(funilComercial?.id || funis[0].id);
    }

    const cardIdFromUrl = searchParams.get('cardId');
    if (cardIdFromUrl && allCards) {
      const card = allCards.find(c => c.id === cardIdFromUrl);
      if (card && card.funil_id && card.funil_id !== selectedFunilId) {
        setSelectedFunilId(card.funil_id);
      }
    }
  }, [funis, allCards, selectedFunilId, searchParams]);

  const getCardsForEtapa = (etapaId: string): CardWithStatus[] => {
    if (!allCards) return [];
    
    const totalNaEtapa = allCards.filter((card) => card.etapa_id === etapaId);
    let filtered = [...totalNaEtapa];

    if (statusFilter !== "todos") {
      filtered = filtered.filter((card) => card.statusInfo?.status === statusFilter);
    }

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

  const selectedFunil = funis?.find(f => f.id === selectedFunilId);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar de Filtros */}
      <FiltersSidebar
        filters={filters}
        setFilters={setFilters}
        selectedFunilId={selectedFunilId}
        setSelectedFunilId={setSelectedFunilId}
        funis={funis}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">
                {selectedFunil?.nome || 'Pipeline'}
              </h2>
              <Badge variant="secondary" className="font-medium">
                {totalCards} conversas
              </Badge>
              {totalPages > 1 && (
                <Badge variant="outline" className="font-normal">
                  Página {currentPage + 1}/{totalPages}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center border border-border rounded-lg bg-muted/30 p-0.5">
                <Button 
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                  className="h-7 rounded-md gap-1.5 px-3"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Kanban</span>
                </Button>
                <Button 
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-7 rounded-md gap-1.5 px-3"
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tabela</span>
                </Button>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="sem">⚠️ Sem Tarefa</SelectItem>
                  <SelectItem value="restante">🟢 Restantes</SelectItem>
                  <SelectItem value="vencida">🔴 Vencidas</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="h-8 gap-1.5"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {sortOrder === "asc" ? "Próximas" : "Distantes"}
                </span>
              </Button>

              {/* Page Size Selector */}
              <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
                <SelectTrigger className="w-[100px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 itens</SelectItem>
                  <SelectItem value="100">100 itens</SelectItem>
                  <SelectItem value="500">500 itens</SelectItem>
                  <SelectItem value="1000">1000 itens</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Refresh */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['all_cards', selectedFunilId] });
                  toast.success("Atualizando cards...");
                }}
                className="h-8"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>

              {/* Funil Actions */}
              {selectedFunilId && selectedFunil && (
                <div className="flex items-center gap-1 border-l border-border pl-2 ml-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEtapasModalOpen(true)}
                    className="h-8 gap-1.5"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Etapas</span>
                  </Button>
                  <FunilActions
                    funil={selectedFunil}
                    onEdit={() => handleEditFunil(selectedFunil)}
                    hasCards={getFunilCardCount(selectedFunilId) > 0}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewFunil}
                    className="h-8 gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Funil</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4">
          {isLoadingEtapas || isLoadingCards || isLoadingFunis ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !selectedFunilId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Selecione um funil para visualizar o pipeline
            </div>
          ) : viewMode === 'table' ? (
            <ListaCards
              cards={allCards || []}
              onRowClick={handleCardClick}
              selectedIds={cardSelection.selectedIds}
              onToggleSelect={cardSelection.toggle}
              onSelectAll={cardSelection.selectAll}
            />
          ) : etapas && etapas.length > 0 ? (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 h-full pb-4">
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
                  <div className="rotate-3 opacity-90 scale-105">
                    <ConversaCard
                      id={activeCard.id}
                      titulo={activeCard.titulo || 'Sem título'}
                      resumo={activeCard.resumo}
                      chatwootConversaId={activeCard.chatwoot_conversa_id || undefined}
                      createdAt={activeCard.created_at || new Date().toISOString()}
                      statusInfo={activeCard.statusInfo}
                      avatarLeadUrl={(activeCard as any).avatar_lead_url}
                      leadScore={(activeCard as any).lead_score}
                      leadScoreCategoria={(activeCard as any).lead_score_categoria}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Nenhuma etapa encontrada para este funil
            </div>
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/50">
            <p className="text-sm text-muted-foreground">
              Mostrando {currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, totalCards)} de {totalCards}
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
                {currentPage + 1} / {totalPages}
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
      </div>

      {/* Modals */}
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

      {/* Barra de ações em massa */}
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
