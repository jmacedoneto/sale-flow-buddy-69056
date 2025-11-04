import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  listMappings, 
  createMapping, 
  updateMapping, 
  deleteMapping,
  getFunis,
  getEtapas,
  type MappingInput 
} from "@/services/mappingsService";
import { toast } from "@/hooks/use-toast";

export const useMappings = () => {
  const queryClient = useQueryClient();

  const { data: mappings = [], isLoading, error } = useQuery({
    queryKey: ['mappings'],
    queryFn: listMappings,
  });

  const { data: funis = [] } = useQuery({
    queryKey: ['funis-names'],
    queryFn: getFunis,
  });

  const { data: etapas = [] } = useQuery({
    queryKey: ['etapas-names'],
    queryFn: () => getEtapas(),
  });

  const createMutation = useMutation({
    mutationFn: createMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
      toast({
        title: "✓ Mapping criado",
        description: "Correlação salva com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro ao criar mapping",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<MappingInput> }) =>
      updateMapping(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
      toast({
        title: "✓ Mapping atualizado",
        description: "Correlação atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro ao atualizar mapping",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mappings'] });
      toast({
        title: "✓ Mapping deletado",
        description: "Correlação removida com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Erro ao deletar mapping",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    mappings,
    funis,
    etapas,
    isLoading,
    error,
    createMapping: createMutation.mutate,
    updateMapping: updateMutation.mutate,
    deleteMapping: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
