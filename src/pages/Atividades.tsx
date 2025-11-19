import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { AtividadesKanban } from "@/components/AtividadesKanban";
import { AtividadesLista } from "@/components/AtividadesLista";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, LayoutList, LayoutGrid } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type PrioridadeFilter = 'todas' | 'baixa' | 'media' | 'alta' | 'urgente';
type PeriodoFilter = 'todos' | 'hoje' | 'esta_semana' | 'este_mes';
type ViewMode = 'kanban' | 'lista';

export default function Atividades() {
  const [searchTerm, setSearchTerm] = useState("");
  const [prioridade, setPrioridade] = useState<PrioridadeFilter>('todas');
  const [periodo, setPeriodo] = useState<PeriodoFilter>('todos');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  
  // P9: Persistir toggle "Mostrar concluídas" em localStorage
  const [mostrarConcluidas, setMostrarConcluidas] = useState(() => {
    const saved = localStorage.getItem('atividades-mostrar-concluidas');
    return saved === 'true';
  });

  const [filters, setFilters] = useState({
    produto: null as string | null,
    funil: null as string | null,
    usuario: null as string | null,
  });

  // P9: Sincronizar toggle com localStorage
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


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Painel de Atividades</h1>
                <p className="text-sm text-muted-foreground">Acompanhe cards com prazos definidos</p>
              </div>
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
              <div className="flex gap-1">
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('kanban')}
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban
                </Button>
                <Button
                  variant={viewMode === 'lista' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('lista')}
                >
                  <LayoutList className="h-4 w-4 mr-2" />
                  Lista
                </Button>
              </div>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou resumo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

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

          <div className="flex gap-2">
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
          </div>
        </div>
        
        {viewMode === 'kanban' ? (
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
        )}
      </div>
    </div>
  );
}
