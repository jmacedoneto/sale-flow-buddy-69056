import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Filter, X, User, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PipelineFilters as FilterType } from "@/utils/pipelineFilters";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";

interface PipelineFiltersProps {
  filters: FilterType;
  setFilters: (filters: FilterType) => void;
  onClear?: () => void;
  selectedFunilId?: string | null;
}

export const PipelineFilters = ({ filters, setFilters, onClear, selectedFunilId }: PipelineFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
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

  const { data: funis = [] } = useQuery({
    queryKey: ['funis'],
    queryFn: async () => {
      const { data, error } = await supabase.from('funis').select('*');
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
      verMeus: !isAdmin, // Não-admin mantém verMeus ativo
    };
    
    // Se não for admin, força assigned_to do usuário
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

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <h3 className="font-semibold">Filtros Avançados</h3>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Recolher' : 'Expandir'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status da Oportunidade */}
          <div>
            <label className="text-sm font-medium mb-2 block">Status da Oportunidade</label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value as any })}
            >
              <SelectTrigger>
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
          <div>
            <label className="text-sm font-medium mb-2 block">Nome do Lead</label>
            <Input
              placeholder="Buscar por nome..."
              value={filters.leadName}
              onChange={(e) => setFilters({ ...filters, leadName: e.target.value })}
            />
          </div>

          {/* Filtro por Etapa - NOVO */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Etapa
            </label>
            <Select
              value={filters.etapaId || 'todas'}
              onValueChange={(value) => setFilters({ ...filters, etapaId: value === 'todas' ? null : value })}
            >
              <SelectTrigger>
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

          {/* Toggle "Ver Meus" + Filtro por Usuário (Admin) */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-1">
              <User className="h-3 w-3" />
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
                  <Label htmlFor="ver-meus" className="text-sm">Ver meus cards</Label>
                </div>
                
                {!filters.verMeus && (
                  <Select
                    value={filters.assignedTo || 'todos'}
                    onValueChange={(value) => setFilters({ ...filters, assignedTo: value === 'todos' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os usuários" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os usuários</SelectItem>
                      {usuarios.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.nome || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50">
                <span className="text-sm text-muted-foreground">Meus cards</span>
              </div>
            )}
          </div>

          {isExpanded && (
            <>
              {/* Funil */}
              <div>
                <label className="text-sm font-medium mb-2 block">Funil</label>
                <Select
                  value={filters.funilId || 'todos'}
                  onValueChange={(value) => setFilters({ ...filters, funilId: value === 'todos' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os funis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os funis</SelectItem>
                    {funis.map((funil) => (
                      <SelectItem key={funil.id} value={funil.id}>
                        {funil.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Produto */}
              <div>
                <label className="text-sm font-medium mb-2 block">Produto</label>
                <Select
                  value={filters.productId || 'todos'}
                  onValueChange={(value) => setFilters({ ...filters, productId: value === 'todos' ? null : value })}
                >
                  <SelectTrigger>
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

              {/* Data Abertura (De) */}
              <div>
                <label className="text-sm font-medium mb-2 block">Data Abertura (De)</label>
                <Input
                  type="date"
                  value={filters.openedFrom || ''}
                  onChange={(e) => setFilters({ ...filters, openedFrom: e.target.value || null })}
                />
              </div>

              {/* Data Abertura (Até) */}
              <div>
                <label className="text-sm font-medium mb-2 block">Data Abertura (Até)</label>
                <Input
                  type="date"
                  value={filters.openedTo || ''}
                  onChange={(e) => setFilters({ ...filters, openedTo: e.target.value || null })}
                />
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};