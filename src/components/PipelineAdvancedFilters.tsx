import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PipelineAdvancedFiltersProps {
  onFiltersChange: (filters: {
    produto: string;
    funil: string;
    statusTarefa: string;
    statusOportunidade: string;
    nomeLead: string;
    dataAbertura: { inicio: string; fim: string };
  }) => void;
}

const FILTERS_STORAGE_KEY = 'pipeline-filters';

export const PipelineAdvancedFilters = ({ onFiltersChange }: PipelineAdvancedFiltersProps) => {
  // Carregar filtros salvos do localStorage
  const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
  const initialFilters = savedFilters ? JSON.parse(savedFilters) : {};

  const [isOpen, setIsOpen] = useState(false);
  const [produto, setProduto] = useState(initialFilters.produto || "");
  const [funil, setFunil] = useState(initialFilters.funil || "");
  const [statusTarefa, setStatusTarefa] = useState(initialFilters.statusTarefa || "");
  const [statusOportunidade, setStatusOportunidade] = useState(initialFilters.statusOportunidade || "");
  const [nomeLead, setNomeLead] = useState(initialFilters.nomeLead || "");
  const [dataInicio, setDataInicio] = useState(initialFilters.dataInicio || "");
  const [dataFim, setDataFim] = useState(initialFilters.dataFim || "");

  const { data: produtos } = useQuery({
    queryKey: ['produtos-filter'],
    queryFn: async () => {
      const { data } = await supabase.from('produtos').select('*').eq('ativo', true);
      return data || [];
    }
  });

  const { data: funis } = useQuery({
    queryKey: ['funis-filter'],
    queryFn: async () => {
      const { data } = await supabase.from('funis').select('*');
      return data || [];
    }
  });

  const handleApplyFilters = () => {
    const filters = {
      produto,
      funil,
      statusTarefa,
      statusOportunidade,
      nomeLead,
      dataAbertura: { inicio: dataInicio, fim: dataFim }
    };
    
    // Salvar filtros no localStorage
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({
      produto,
      funil,
      statusTarefa,
      statusOportunidade,
      nomeLead,
      dataInicio,
      dataFim
    }));

    onFiltersChange(filters);
  };

  const handleClearFilters = () => {
    setProduto("");
    setFunil("");
    setStatusTarefa("");
    setStatusOportunidade("");
    setNomeLead("");
    setDataInicio("");
    setDataFim("");
    
    // Limpar localStorage
    localStorage.removeItem(FILTERS_STORAGE_KEY);
    
    onFiltersChange({
      produto: "",
      funil: "",
      statusTarefa: "",
      statusOportunidade: "",
      nomeLead: "",
      dataAbertura: { inicio: "", fim: "" }
    });
  };

  // Aplicar filtros salvos ao montar o componente
  useEffect(() => {
    if (savedFilters) {
      handleApplyFilters();
    }
  }, []); // Executar apenas uma vez ao montar

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros Avançados
              </CardTitle>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nome do Lead</Label>
                <Input
                  placeholder="Buscar por nome..."
                  value={nomeLead}
                  onChange={(e) => setNomeLead(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Produto</Label>
                <Select value={produto} onValueChange={setProduto}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os produtos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {produtos?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Funil</Label>
                <Select value={funil} onValueChange={setFunil}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os funis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {funis?.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status da Tarefa</Label>
                <Select value={statusTarefa} onValueChange={setStatusTarefa}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="vencida">Vencida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status da Oportunidade</Label>
                <Select value={statusOportunidade} onValueChange={setStatusOportunidade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="em_andamento">Ativa</SelectItem>
                    <SelectItem value="ganho">Ganha</SelectItem>
                    <SelectItem value="perdido">Perdida</SelectItem>
                    <SelectItem value="pausado">Pausada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data de Abertura (Início)</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Abertura (Fim)</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleApplyFilters} className="flex-1">
                Aplicar Filtros
              </Button>
              <Button onClick={handleClearFilters} variant="outline">
                Limpar
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
