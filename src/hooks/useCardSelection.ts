import { useState, useCallback } from 'react';

export interface UseCardSelectionReturn {
  selectedIds: Set<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  count: number;
}

export const useCardSelection = (): UseCardSelectionReturn => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    selectedIds,
    isSelected,
    toggle,
    selectAll,
    clear,
    count: selectedIds.size,
  };
};
