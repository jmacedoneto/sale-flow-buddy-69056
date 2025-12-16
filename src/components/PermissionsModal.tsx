import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator';

interface Permission {
  id: string;
  label: string;
  key: keyof PermissionValues;
  description?: string;
}

interface PermissionValues {
  criar_card: boolean;
  editar_card: boolean;
  deletar_card: boolean;
  edit_funil: boolean;
  edit_etapas: boolean;
  ver_relatorios: boolean;
  gerenciar_usuarios: boolean;
  ver_cards_outros: boolean;
}

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    nome?: string;
    email: string;
  };
  initialPermissions?: Partial<PermissionValues>;
}

const PERMISSIONS: Permission[] = [
  { id: 'criar_card', label: 'Criar Cards', key: 'criar_card', description: 'Permite criar novos cards no pipeline' },
  { id: 'editar_card', label: 'Editar Cards', key: 'editar_card', description: 'Permite editar cards existentes' },
  { id: 'deletar_card', label: 'Deletar Cards', key: 'deletar_card', description: 'Permite excluir cards' },
  { id: 'edit_funil', label: 'Editar Funis', key: 'edit_funil', description: 'Permite criar e editar funis' },
  { id: 'edit_etapas', label: 'Editar Etapas', key: 'edit_etapas', description: 'Permite criar e editar etapas dos funis' },
  { id: 'ver_relatorios', label: 'Ver Relatórios', key: 'ver_relatorios', description: 'Acesso aos dashboards e relatórios' },
  { id: 'gerenciar_usuarios', label: 'Gerenciar Usuários (Admin)', key: 'gerenciar_usuarios', description: 'Permite aprovar e gerenciar outros usuários' },
];

const SPECIAL_PERMISSIONS: Permission[] = [
  { id: 'ver_cards_outros', label: 'Ver Cards de Outros Usuários', key: 'ver_cards_outros', description: 'Permite visualizar cards atribuídos a outros agentes' },
];

export const PermissionsModal = ({ isOpen, onClose, user, initialPermissions = {} }: PermissionsModalProps) => {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<PermissionValues>({
    criar_card: initialPermissions.criar_card ?? false,
    editar_card: initialPermissions.editar_card ?? false,
    deletar_card: initialPermissions.deletar_card ?? false,
    edit_funil: initialPermissions.edit_funil ?? false,
    edit_etapas: initialPermissions.edit_etapas ?? false,
    ver_relatorios: initialPermissions.ver_relatorios ?? false,
    gerenciar_usuarios: initialPermissions.gerenciar_usuarios ?? false,
    ver_cards_outros: initialPermissions.ver_cards_outros ?? false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('users_crm')
        .update({
          ...permissions,
          approved: true,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Permissões salvas com sucesso');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar permissões:', error);
      toast.error('Erro ao salvar permissões');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar Permissões</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Usuário: {user.nome || user.email}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Permissões Gerais</h4>
            {PERMISSIONS.map((permission) => (
              <div key={permission.id} className="flex items-start space-x-3">
                <Checkbox
                  id={permission.id}
                  checked={permissions[permission.key]}
                  onCheckedChange={(checked) =>
                    setPermissions((prev) => ({
                      ...prev,
                      [permission.key]: checked === true,
                    }))
                  }
                />
                <div className="flex flex-col gap-0.5">
                  <Label
                    htmlFor={permission.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {permission.label}
                  </Label>
                  {permission.description && (
                    <span className="text-xs text-muted-foreground">{permission.description}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Visibilidade</h4>
            {SPECIAL_PERMISSIONS.map((permission) => (
              <div key={permission.id} className="flex items-start space-x-3">
                <Checkbox
                  id={permission.id}
                  checked={permissions[permission.key]}
                  onCheckedChange={(checked) =>
                    setPermissions((prev) => ({
                      ...prev,
                      [permission.key]: checked === true,
                    }))
                  }
                />
                <div className="flex flex-col gap-0.5">
                  <Label
                    htmlFor={permission.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {permission.label}
                  </Label>
                  {permission.description && (
                    <span className="text-xs text-muted-foreground">{permission.description}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar Permissões'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
