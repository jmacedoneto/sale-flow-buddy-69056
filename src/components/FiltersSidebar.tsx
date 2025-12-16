import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Filter, X, User, Layers, ChevronLeft, ChevronRight, Calendar, Package, FolderKanban, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PipelineFilters as FilterType } from "@/utils/pipelineFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Funil } from "@/types/database";

interface FiltersSidebarProps {
  filters: FilterType;
  setFilters: (filters: FilterType) => void;
  onClear?: () => void;
  selectedFunilId: string | null;
  setSelectedFunilId: (id: string | null) => void;
  funis: Funil[] | undefined;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const FiltersSidebar = ({ 
  filters, 
  setFilters, 
  onClear, 
  selectedFunilId,
  setSelectedFunilId,
  funis,
  collapsed,
  setCollapsed
}: FiltersSidebarProps) => {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const { isAdmin } = usePermissions();
  const { user } = useAuth();

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('produtos').select('*').eq('ativo', true);
      if (error) throw error;
      return data;
    },
  });

  // Buscar etapas do funil selecionado
  const { data: etapas = [] } = useQuery({
    queryKey: ['etapas', selectedFunilId],
    queryFn: async () => {
      if (!selectedFunilId) return [];
      const { data, error } = await supabase
        .from('etapas')
        .select('*')
        .eq('funil_id', selectedFunilId)
        .order('ordem');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedFunilId,
  });

  // Buscar usuários (apenas para admin)
  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios_crm'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users_crm')
        .select('id, nome, email')
        .eq('ativo', true)
        .eq('approved', true)
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Se não for admin, força "Ver Meus" como true
  useEffect(() => {
    if (!isAdmin && !filters.verMeus && user?.id) {
      setFilters({ ...filters, verMeus: true, assignedTo: user.id });
    }
  }, [isAdmin, user?.id]);

  const handleClear = () => {
    const baseFilters: FilterType = {
      status: 'ativo',
      leadName: '',
      productId: null,
      openedFrom: null,
      openedTo: null,
      funilId: null,
      etapaId: null,
      assignedTo: null,
      verMeus: !isAdmin,
    };
    
    if (!isAdmin && user?.id) {
      baseFilters.assignedTo = user.id;
    }
    
    setFilters(baseFilters);
    onClear?.();
  };

  const handleVerMeusChange = (checked: boolean) => {
    if (checked && user?.id) {
      setFilters({ ...filters, verMeus: true, assignedTo: user.id });
    } else {
      setFilters({ ...filters, verMeus: false, assignedTo: null });
    }
  };

  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('filters-sidebar-collapsed', JSON.stringify(newState));
  };

  if (collapsed) {
    return (
      <aside className="w-12 border-r border-border bg-card/50 backdrop-blur-sm flex flex-col items-center py-4 gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex flex-col gap-3 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <Layers className="h-4 w-4 text-muted-foreground" />
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 border-r border-border bg-card/50 backdrop-blur-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Filtros</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Filters Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Funil Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" />
            Funil
          </label>
          <Select value={selectedFunilId || undefined} onValueChange={setSelectedFunilId}>
            <SelectTrigger className="h-9 bg-background/50">
              <SelectValue placeholder="Selecione um funil" />
            </SelectTrigger>
            <SelectContent>
              {funis?.map((funil) => (
                <SelectItem key={funil.id} value={funil.id}>
                  {funil.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Status da Oportunidade</label>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value as any })}
          >
            <SelectTrigger className="h-9 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="ganho">Ganho</SelectItem>
              <SelectItem value="perdido">Perdido</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Nome do Lead */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Nome do Lead</label>
          <Input
            placeholder="Buscar por nome..."
            value={filters.leadName}
            onChange={(e) => setFilters({ ...filters, leadName: e.target.value })}
            className="h-9 bg-background/50"
          />
        </div>

        {/* Etapa */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Etapa
          </label>
          <Select
            value={filters.etapaId || 'todas'}
            onValueChange={(value) => setFilters({ ...filters, etapaId: value === 'todas' ? null : value })}
          >
            <SelectTrigger className="h-9 bg-background/50">
              <SelectValue placeholder="Todas as etapas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as etapas</SelectItem>
              {etapas.map((etapa) => (
                <SelectItem key={etapa.id} value={etapa.id}>
                  {etapa.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Responsável */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Responsável
          </label>
          
          {isAdmin ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="ver-meus"
                  checked={filters.verMeus}
                  onCheckedChange={handleVerMeusChange}
                />
                <Label htmlFor="ver-meus" className="text-xs">Ver meus cards</Label>
              </div>
              
              {!filters.verMeus && (
                <Select
                  value={filters.assignedTo || 'todos'}
                  onValueChange={(value) => setFilters({ ...filters, assignedTo: value === 'todos' ? null : value })}
                >
                  <SelectTrigger className="h-9 bg-background/50">
                    <SelectValue placeholder="Todos os usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os usuários</SelectItem>
                    {usuarios.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="flex items-center h-9 px-3 rounded-md border bg-muted/30 text-xs text-muted-foreground">
              Meus cards
            </div>
          )}
        </div>

        {/* Filtros Avançados */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-8 px-2">
              <span className="text-xs font-medium">Filtros Avançados</span>
              {advancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            {/* Produto */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Produto
              </label>
              <Select
                value={filters.productId || 'todos'}
                onValueChange={(value) => setFilters({ ...filters, productId: value === 'todos' ? null : value })}
              >
                <SelectTrigger className="h-9 bg-background/50">
                  <SelectValue placeholder="Todos os produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os produtos</SelectItem>
                  {produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data De */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Data Abertura (De)
              </label>
              <Input
                type="date"
                value={filters.openedFrom || ''}
                onChange={(e) => setFilters({ ...filters, openedFrom: e.target.value || null })}
                className="h-9 bg-background/50"
              />
            </div>

            {/* Data Até */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Data Abertura (Até)
              </label>
              <Input
                type="date"
                value={filters.openedTo || ''}
                onChange={(e) => setFilters({ ...filters, openedTo: e.target.value || null })}
                className="h-9 bg-background/50"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleClear}
          className="w-full h-8 text-xs"
        >
          <X className="h-3.5 w-3.5 mr-1.5" />
          Limpar Filtros
        </Button>
      </div>
    </aside>
  );
};
