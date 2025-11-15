import { ReactNode, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutGrid, List } from "lucide-react";
import { useFunis } from "@/hooks/useFunis";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Template unificado para dashboards Comercial e Administrativo.
 * Centraliza header, seletor de funil e toggle Kanban/Lista (DRY, SRP).
 * Onda 2: Adiciona controle de viewMode com persistência em localStorage.
 */

export type ViewMode = 'kanban' | 'list';

interface DashboardTemplateProps {
  title: string;
  funilIds?: string[]; // Se não informado, mostra todos os funis permitidos
  defaultViewMode?: ViewMode;
  storageKey?: string; // Key para persistir viewMode no localStorage
  children: (props: {
    selectedFunilId: string | null;
    viewMode: ViewMode;
  }) => ReactNode;
}

export const DashboardTemplate = ({
  title,
  funilIds,
  defaultViewMode = 'kanban',
  storageKey = 'dashboard-view-mode',
  children,
}: DashboardTemplateProps) => {
  const { data: allFunis = [], isLoading: loadingFunis } = useFunis();
  
  // Persistir viewMode em localStorage
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(storageKey);
    return (stored as ViewMode) || defaultViewMode;
  });
  
  const [selectedFunilId, setSelectedFunilId] = useState<string | null>(null);

  // Sincronizar viewMode com localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, viewMode);
  }, [viewMode, storageKey]);

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

          {/* Toggle Kanban / Lista - Visual Moderno */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border/50">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="gap-2 transition-all"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-2 transition-all"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
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
