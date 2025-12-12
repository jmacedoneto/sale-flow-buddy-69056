import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: Set<string>;
  onClear: () => void;
  funilId?: string | null;
}

export const BulkActionsBar = ({
  selectedCount,
  selectedIds,
  onClear,
  funilId,
}: BulkActionsBarProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  if (selectedCount === 0) return null;

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const idsArray = Array.from(selectedIds);
      
      const { error } = await supabase
        .from('cards_conversas')
        .delete()
        .in('id', idsArray);

      if (error) throw error;

      toast.success(`${selectedCount} card(s) excluído(s) com sucesso`);
      onClear();
      
      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['all_cards', funilId] });
      queryClient.invalidateQueries({ queryKey: ['cards_sem_tarefa'] });
    } catch (error) {
      console.error('Erro ao excluir cards:', error);
      toast.error('Erro ao excluir cards', {
        description: String(error),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 bg-card border border-border shadow-elegant rounded-lg px-4 py-3">
        <span className="text-sm font-medium text-foreground">
          {selectedCount} {selectedCount === 1 ? 'selecionado' : 'selecionados'}
        </span>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              Excluir ({selectedCount})
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a excluir {selectedCount} card(s). Esta ação não pode ser desfeita.
                Todos os dados associados (atividades, produtos, histórico) serão perdidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      </div>
    </div>
  );
};
