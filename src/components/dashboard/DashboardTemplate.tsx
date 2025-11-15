import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutGrid, List } from "lucide-react";
import { useFunis } from "@/hooks/useFunis";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Template unificado para dashboards Comercial e Administrativo.
 * Centraliza header, seletor de funil e toggle Kanban/Lista (DRY, SRP).
 */

export type ViewMode = 'kanban' | 'list';

interface DashboardTemplateProps {
  title: string;
  funilIds?: string[]; // Se não informado, mostra todos os funis permitidos
  defaultViewMode?: ViewMode;
  children: (props: {
    selectedFunilId: string | null;
    viewMode: ViewMode;
  }) => ReactNode;
}

export const DashboardTemplate = ({
  title,
  funilIds,
  defaultViewMode = 'kanban',
  children,
}: DashboardTemplateProps) => {
  const { data: allFunis = [], isLoading: loadingFunis } = useFunis();
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [selectedFunilId, setSelectedFunilId] = useState<string | null>(null);

  // Filtrar funis baseado em funilIds (se fornecido)
  const availableFunis = funilIds
    ? allFunis.filter(f => funilIds.includes(f.id))
    : allFunis;

  // Selecionar primeiro funil automaticamente
  if (!selectedFunilId && availableFunis.length > 0) {
    setSelectedFunilId(availableFunis[0].id);
  }

  if (loadingFunis) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header com título, seletor de funil e toggle de visualização */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        
        <div className="flex items-center gap-3">
          {/* Seletor de funil */}
          {availableFunis.length > 1 && (
            <Select
              value={selectedFunilId || undefined}
              onValueChange={setSelectedFunilId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione um funil" />
              </SelectTrigger>
              <SelectContent>
                {availableFunis.map(funil => (
                  <SelectItem key={funil.id} value={funil.id}>
                    {funil.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Toggle Kanban / Lista */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              Lista
            </Button>
          </div>
        </div>
      </div>

      {/* Área de conteúdo (renderizada pelos dashboards específicos) */}
      <div className="min-h-[600px]">
        {children({ selectedFunilId, viewMode })}
      </div>
    </div>
  );
};
