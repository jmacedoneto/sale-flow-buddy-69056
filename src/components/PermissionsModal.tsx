import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Permission {
  id: string;
  label: string;
  key: keyof PermissionValues;
}

interface PermissionValues {
  ver_dashboard: boolean;
  criar_card: boolean;
  editar_card: boolean;
  deletar_card: boolean;
  edit_funil: boolean;
  edit_etapas: boolean;
  ver_relatorios: boolean;
  gerenciar_usuarios: boolean;
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
  { id: 'ver_dashboard', label: 'Visualizar Dashboard', key: 'ver_dashboard' },
  { id: 'criar_card', label: 'Criar Cards', key: 'criar_card' },
  { id: 'editar_card', label: 'Editar Cards', key: 'editar_card' },
  { id: 'deletar_card', label: 'Deletar Cards', key: 'deletar_card' },
  { id: 'edit_funil', label: 'Editar Funis', key: 'edit_funil' },
  { id: 'edit_etapas', label: 'Editar Etapas', key: 'edit_etapas' },
  { id: 'ver_relatorios', label: 'Ver Relatórios', key: 'ver_relatorios' },
  { id: 'gerenciar_usuarios', label: 'Gerenciar Usuários (Admin)', key: 'gerenciar_usuarios' },
];

export const PermissionsModal = ({ isOpen, onClose, user, initialPermissions = {} }: PermissionsModalProps) => {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<PermissionValues>({
    ver_dashboard: initialPermissions.ver_dashboard ?? false,
    criar_card: initialPermissions.criar_card ?? false,
    editar_card: initialPermissions.editar_card ?? false,
    deletar_card: initialPermissions.deletar_card ?? false,
    edit_funil: initialPermissions.edit_funil ?? false,
    edit_etapas: initialPermissions.edit_etapas ?? false,
    ver_relatorios: initialPermissions.ver_relatorios ?? false,
    gerenciar_usuarios: initialPermissions.gerenciar_usuarios ?? false,
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
          {PERMISSIONS.map((permission) => (
            <div key={permission.id} className="flex items-center space-x-2">
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
              <Label
                htmlFor={permission.id}
                className="text-sm font-normal cursor-pointer"
              >
                {permission.label}
              </Label>
            </div>
          ))}
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
