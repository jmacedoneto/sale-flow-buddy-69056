import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PermissionsModal } from '@/components/PermissionsModal';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface UserCRM {
  id: string;
  email: string;
  nome: string | null;
  role: string | null;
  approved: boolean | null;
  ativo: boolean | null;
  ver_dashboard: boolean | null;
  criar_card: boolean | null;
  editar_card: boolean | null;
  deletar_card: boolean | null;
  edit_funil: boolean | null;
  edit_etapas: boolean | null;
  ver_relatorios: boolean | null;
  gerenciar_usuarios: boolean | null;
}

export default function ConfiguracoesUsers() {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<UserCRM | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery<UserCRM[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users_crm')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as UserCRM[];
    },
  });

  const pendingUsers = users.filter((u) => !u.approved);
  const activeUsers = users.filter((u) => u.approved);

  const handleOpenPermissions = (user: UserCRM) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <p>Carregando usuários...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                Usuários Pendentes ({pendingUsers.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Usuários Ativos ({activeUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário pendente de aprovação
                </p>
              ) : (
                pendingUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{user.nome || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Pendente</Badge>
                      <Button onClick={() => handleOpenPermissions(user)}>
                        Aprovar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              {activeUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário ativo
                </p>
              ) : (
                activeUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{user.nome || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {user.ver_dashboard && <Badge variant="outline">Dashboard</Badge>}
                        {user.criar_card && <Badge variant="outline">Criar Cards</Badge>}
                        {user.editar_card && <Badge variant="outline">Editar Cards</Badge>}
                        {user.gerenciar_usuarios && <Badge>Admin</Badge>}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleOpenPermissions(user)}
                    >
                      Editar Permissões
                    </Button>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedUser && (
        <PermissionsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          initialPermissions={{
            ver_dashboard: selectedUser.ver_dashboard ?? false,
            criar_card: selectedUser.criar_card ?? false,
            editar_card: selectedUser.editar_card ?? false,
            deletar_card: selectedUser.deletar_card ?? false,
            edit_funil: selectedUser.edit_funil ?? false,
            edit_etapas: selectedUser.edit_etapas ?? false,
            ver_relatorios: selectedUser.ver_relatorios ?? false,
            gerenciar_usuarios: selectedUser.gerenciar_usuarios ?? false,
          }}
        />
      )}
    </div>
  );
}
