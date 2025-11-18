import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PipelineFilters as FilterType } from "@/utils/pipelineFilters";

interface PipelineFiltersProps {
  filters: FilterType;
  setFilters: (filters: FilterType) => void;
  onClear?: () => void;
}

export const PipelineFilters = ({ filters, setFilters, onClear }: PipelineFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const handleClear = () => {
    setFilters({
      status: 'ativo',
      leadName: '',
      productId: null,
      openedFrom: null,
      openedTo: null,
      funilId: null,
    });
    onClear?.();
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {isExpanded && (
            <>
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
