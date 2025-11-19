import { useEffect, useRef } from 'react';
import { useUpdateCard } from './useFunis';
import { toast } from 'sonner';

interface UseAutosaveProps {
  cardId: string;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Hook para autosave de cards com debounce
 */
export const useAutosave = ({ cardId, enabled = true, debounceMs = 500 }: UseAutosaveProps) => {
  const updateCard = useUpdateCard();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isSavingRef = useRef(false);

  const save = (updates: any) => {
    if (!enabled || isSavingRef.current) return;

    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Criar novo timeout para debounce
    timeoutRef.current = setTimeout(() => {
      isSavingRef.current = true;
      
      updateCard.mutate(
        { id: cardId, updates },
        {
          onSuccess: () => {
            isSavingRef.current = false;
            // Toast discreto de feedback
            toast.success("✓ Salvo", { duration: 1000 });
          },
          onError: () => {
            isSavingRef.current = false;
            toast.error("Erro ao salvar");
          },
        }
      );
    }, debounceMs);
  };

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    save,
    isSaving: updateCard.isPending,
  };
};