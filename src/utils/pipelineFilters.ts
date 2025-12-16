import { useState } from 'react';
import { CardConversa } from '@/types/database';

export interface PipelineFilters {
  status: 'ativo' | 'pausado' | 'perdido' | 'ganho' | 'todos';
  leadName: string;
  productId: string | null;
  openedFrom: string | null;
  openedTo: string | null;
  funilId: string | null;
  etapaId: string | null;        // NOVO: Filtro por etapa
  assignedTo: string | null;     // NOVO: Filtro por responsável
  verMeus: boolean;              // NOVO: Toggle "Ver Meus"
}

export const usePipelineFilters = () => {
  const [filters, setFilters] = useState<PipelineFilters>({
    status: 'ativo',
    leadName: '',
    productId: null,
    openedFrom: null,
    openedTo: null,
    funilId: null,
    etapaId: null,
    assignedTo: null,
    verMeus: false,
  });

  const applyFilters = (cards: CardConversa[]): CardConversa[] => {
    return cards.filter(card => {
      // Filtro de status
      if (filters.status !== 'todos') {
        if (filters.status === 'ativo' && card.status !== 'em_andamento') return false;
        if (filters.status === 'pausado' && !card.pausado) return false;
        if (filters.status === 'perdido' && card.status !== 'perdido') return false;
        if (filters.status === 'ganho' && card.status !== 'ganho') return false;
      }

      // Filtro de nome
      if (filters.leadName && card.titulo && !card.titulo.toLowerCase().includes(filters.leadName.toLowerCase())) {
        return false;
      }

      // Filtro de funil
      if (filters.funilId && card.funil_id !== filters.funilId) {
        return false;
      }

      // Filtro de etapa
      if (filters.etapaId && card.etapa_id !== filters.etapaId) {
        return false;
      }

      // Filtro de data de abertura
      if (filters.openedFrom && card.created_at && new Date(card.created_at) < new Date(filters.openedFrom)) {
        return false;
      }

      if (filters.openedTo && card.created_at && new Date(card.created_at) > new Date(filters.openedTo)) {
        return false;
      }

      return true;
    });
  };

  return { filters, setFilters, applyFilters };
};