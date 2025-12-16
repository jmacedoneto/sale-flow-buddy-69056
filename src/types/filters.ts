/**
 * Interface padronizada para filtros de pipeline
 * Usada em PipelineAdvancedFilters, Dashboard e useAllCardsForFunil
 */
export interface PipelineFilters {
  status: 'ativo' | 'pausado' | 'perdido' | 'ganho' | 'todos';
  leadName: string;
  productId: string | null;
  funilId: string | null;
  etapaId: string | null;        // NOVO: Filtro por etapa
  assignedTo: string | null;     // NOVO: Filtro por responsável
  verMeus: boolean;              // NOVO: Toggle "Ver Meus"
  openedFrom: string | null;
  openedTo: string | null;
}

export const DEFAULT_FILTERS: PipelineFilters = {
  status: 'ativo',
  leadName: '',
  productId: null,
  funilId: null,
  etapaId: null,
  assignedTo: null,
  verMeus: false,
  openedFrom: null,
  openedTo: null,
};