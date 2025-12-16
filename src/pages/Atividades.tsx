import { useState, useEffect } from "react";
import { AtividadesKanban } from "@/components/AtividadesKanban";
import { AtividadesLista } from "@/components/AtividadesLista";
import { AtividadesAdminKanban } from "@/components/AtividadesAdminKanban";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, LayoutList, LayoutGrid, Briefcase, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";

type PrioridadeFilter = 'todas' | 'baixa' | 'media' | 'alta' | 'urgente';
type PeriodoFilter = 'todos' | 'hoje' | 'esta_semana' | 'este_mes';
type ViewMode = 'kanban' | 'lista';
type TabMode = 'comercial' | 'administrativo';

export default function Atividades() {
  const [searchTerm, setSearchTerm] = useState("");
  const [prioridade, setPrioridade] = useState<PrioridadeFilter>('todas');
  const [periodo, setPeriodo] = useState<PeriodoFilter>('todos');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [adminViewMode, setAdminViewMode] = useState<ViewMode>('kanban');
  const [tabMode, setTabMode] = useState<TabMode>('comercial');
  const { isAdmin } = usePermissions();
  const { user } = useAuth();
  
  const [mostrarConcluidas, setMostrarConcluidas] = useState(() => {
    const saved = localStorage.getItem('atividades-mostrar-concluidas');
    return saved === 'true';
  });

  const [filters, setFilters] = useState({
    produto: null as string | null,
    funil: null as string | null,
    usuario: null as string | null,
  });

  // Filtro automático para não-admin
  useEffect(() => {
    if (!isAdmin && user?.id) {
      setFilters(prev => ({ ...prev, usuario: user.id }));
    }
  }, [isAdmin, user?.id]);

  useEffect(() => {
    localStorage.setItem('atividades-mostrar-concluidas', String(mostrarConcluidas));
  }, [mostrarConcluidas]);

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

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-lista'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users_crm')
        .select('id, nome, email')
        .eq('status', 'approved');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gradient">Painel de Atividades</h1>
              <p className="text-sm text-muted-foreground">
                {tabMode === 'comercial' ? 'Follow-up comercial e retornos' : 'Tarefas administrativas'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="mostrar-concluidas"
                  checked={mostrarConcluidas}
                  onCheckedChange={setMostrarConcluidas}
                />
                <Label htmlFor="mostrar-concluidas">Mostrar concluídas</Label>
              </div>
              
              {/* View Mode Toggle - aparece para ambos os modos */}
              <div className="flex gap-1 border border-border rounded-xl p-1 bg-muted/30">
                <Button
                  variant={(tabMode === 'comercial' ? viewMode : adminViewMode) === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => tabMode === 'comercial' ? setViewMode('kanban') : setAdminViewMode('kanban')}
                  className="rounded-lg"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban
                </Button>
                <Button
                  variant={(tabMode === 'comercial' ? viewMode : adminViewMode) === 'lista' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => tabMode === 'comercial' ? setViewMode('lista') : setAdminViewMode('lista')}
                  className="rounded-lg"
                >
                  <LayoutList className="h-4 w-4 mr-2" />
                  Lista
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs de contexto */}
          <Tabs value={tabMode} onValueChange={(v) => setTabMode(v as TabMode)} className="mb-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="comercial" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Follow-up Comercial
              </TabsTrigger>
              <TabsTrigger value="administrativo" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Administrativo
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou resumo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros - aparecem para ambos os modos */}
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Prioridade:</span>
              <div className="flex gap-1">
                {(['todas', 'baixa', 'media', 'alta', 'urgente'] as PrioridadeFilter[]).map((p) => (
                  <Button
                    key={p}
                    variant={prioridade === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPrioridade(p)}
                  >
                    {p === 'todas' ? 'Todas' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm font-medium">Período:</span>
              <div className="flex gap-1">
                {(['todos', 'hoje', 'esta_semana', 'este_mes'] as PeriodoFilter[]).map((per) => (
                  <Button
                    key={per}
                    variant={periodo === per ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPeriodo(per)}
                  >
                    {per === 'todos' ? 'Todos' : per === 'hoje' ? 'Hoje' : per === 'esta_semana' ? 'Esta Semana' : 'Este Mês'}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select
              value={filters.funil || 'todos'}
              onValueChange={(value) => setFilters({ ...filters, funil: value === 'todos' ? null : value })}
            >
              <SelectTrigger className="w-48">
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

            <Select
              value={filters.produto || 'todos'}
              onValueChange={(value) => setFilters({ ...filters, produto: value === 'todos' ? null : value })}
            >
              <SelectTrigger className="w-48">
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

            {isAdmin && (
              <Select
                value={filters.usuario || 'todos'}
                onValueChange={(value) => setFilters({ ...filters, usuario: value === 'todos' ? null : value })}
              >
                <SelectTrigger className="w-48">
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
        </div>
        
        {tabMode === 'comercial' ? (
          viewMode === 'kanban' ? (
            <AtividadesKanban
              filters={filters}
              searchTerm={searchTerm}
              prioridade={prioridade}
              periodo={periodo}
            />
          ) : (
            <AtividadesLista
              filters={filters}
              searchTerm={searchTerm}
              mostrarConcluidas={mostrarConcluidas}
            />
          )
        ) : (
          adminViewMode === 'kanban' ? (
            <AtividadesAdminKanban
              searchTerm={searchTerm}
              mostrarConcluidas={mostrarConcluidas}
              userId={isAdmin ? filters.usuario : user?.id}
            />
          ) : (
            <AtividadesLista
              filters={filters}
              searchTerm={searchTerm}
              mostrarConcluidas={mostrarConcluidas}
            />
          )
        )}
      </div>
    </div>
  );
}
