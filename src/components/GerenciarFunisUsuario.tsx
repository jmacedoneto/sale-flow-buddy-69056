import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface GerenciarFunisUsuarioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export const GerenciarFunisUsuario = ({ open, onOpenChange, userId, userName }: GerenciarFunisUsuarioProps) => {
  const queryClient = useQueryClient();
  const [acessos, setAcessos] = useState<Record<string, { canView: boolean; canEdit: boolean }>>({});

  const { data: funis = [], isLoading: loadingFunis } = useQuery({
    queryKey: ['funis-todos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('funis').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: acessosExistentes, isLoading: loadingAcessos } = useQuery({
    queryKey: ['user-funil-access', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_funil_access')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (acessosExistentes && funis.length > 0) {
      const acessosMap: Record<string, { canView: boolean; canEdit: boolean }> = {};
      funis.forEach((funil) => {
        const acesso = acessosExistentes.find((a) => a.funil_id === funil.id);
        acessosMap[funil.id] = {
          canView: acesso?.can_view ?? false,
          canEdit: acesso?.can_edit ?? false,
        };
      });
      setAcessos(acessosMap);
    }
  }, [acessosExistentes, funis]);

  const salvarMutation = useMutation({
    mutationFn: async () => {
      // Deletar acessos antigos
      await supabase.from('user_funil_access').delete().eq('user_id', userId);

      // Inserir novos acessos
      const novosAcessos = Object.entries(acessos)
        .filter(([_, acesso]) => acesso.canView || acesso.canEdit)
        .map(([funilId, acesso]) => ({
          user_id: userId,
          funil_id: funilId,
          can_view: acesso.canView,
          can_edit: acesso.canEdit,
        }));

      if (novosAcessos.length > 0) {
        const { error } = await supabase.from('user_funil_access').insert(novosAcessos);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Acessos atualizados com sucesso');
      queryClient.invalidateQueries({ queryKey: ['user-funil-access'] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Erro ao salvar acessos:', error);
      toast.error('Erro ao salvar acessos');
    },
  });

  const handleToggleView = (funilId: string, checked: boolean) => {
    setAcessos((prev) => ({
      ...prev,
      [funilId]: {
        canView: checked,
        canEdit: checked ? prev[funilId]?.canEdit ?? false : false,
      },
    }));
  };

  const handleToggleEdit = (funilId: string, checked: boolean) => {
    setAcessos((prev) => ({
      ...prev,
      [funilId]: {
        canView: true, // Editar sempre requer visualizar
        canEdit: checked,
      },
    }));
  };

  if (loadingFunis || loadingAcessos) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Acessos aos Funis - {userName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {funis.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum funil encontrado
            </p>
          ) : (
            funis.map((funil) => (
              <div key={funil.id} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className="flex-1 font-medium">{funil.nome}</div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`view-${funil.id}`}
                      checked={acessos[funil.id]?.canView ?? false}
                      onCheckedChange={(checked) => handleToggleView(funil.id, checked as boolean)}
                    />
                    <Label htmlFor={`view-${funil.id}`} className="cursor-pointer">
                      Visualizar
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-${funil.id}`}
                      checked={acessos[funil.id]?.canEdit ?? false}
                      onCheckedChange={(checked) => handleToggleEdit(funil.id, checked as boolean)}
                      disabled={!acessos[funil.id]?.canView}
                    />
                    <Label htmlFor={`edit-${funil.id}`} className="cursor-pointer">
                      Editar
                    </Label>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending}>
            {salvarMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
