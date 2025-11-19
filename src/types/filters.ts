/**
 * Interface padronizada para filtros de pipeline
 * Usada em PipelineAdvancedFilters, Dashboard e useAllCardsForFunil
 */
export interface PipelineFilters {
  status: 'ativo' | 'pausado' | 'perdido' | 'ganho' | 'todos';
  leadName: string;
  productId: string | null;
  funilId: string | null;
  openedFrom: string | null;
  openedTo: string | null;
}

export const DEFAULT_FILTERS: PipelineFilters = {
  status: 'ativo',
  leadName: '',
  productId: null,
  funilId: null,
  openedFrom: null,
  openedTo: null,
};
