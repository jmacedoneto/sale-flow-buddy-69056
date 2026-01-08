import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, Settings, CheckCircle, XCircle, Clock, Key, UserPlus, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GerenciarFunisUsuario } from "./GerenciarFunisUsuario";
import { PermissionsModal } from "./PermissionsModal";
import { CreateUserModal } from "./CreateUserModal";
import { usePermissions } from "@/hooks/usePermissions";
import { useUpdateUserStatus } from "@/hooks/useUpdateUserStatus";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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

export const AbaUsuarios = () => {
  const [gerenciarFunisOpen, setGerenciarFunisOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; nome: string } | null>(null);
  const [statusTab, setStatusTab] = useState<'todos' | 'pending' | 'approved' | 'blocked'>('todos');
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [editingChatwootId, setEditingChatwootId] = useState<{ [userId: string]: string }>({});
  const [savingChatwootId, setSavingChatwootId] = useState<string | null>(null);
  const [userForPermissions, setUserForPermissions] = useState<{
    id: string;
    nome?: string;
    email: string;
    permissions: PermissionValues;
  } | null>(null);

  const { isAdmin, loading: permissionsLoading } = usePermissions();
  const updateUserStatus = useUpdateUserStatus();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (!isAdmin) return [];

      const { data, error } = await supabase
        .from('users_crm')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin
  });

  const handleSaveChatwootId = async (userId: string, currentValue: number | null) => {
    const newValue = editingChatwootId[userId];
    const parsedValue = newValue ? parseInt(newValue, 10) : null;
    
    if (newValue && isNaN(parsedValue as number)) {
      toast.error("ID Chatwoot deve ser um número");
      return;
    }

    if (parsedValue === currentValue) {
      setEditingChatwootId(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      return;
    }

    setSavingChatwootId(userId);
    try {
      const { error } = await supabase
        .from('users_crm')
        .update({ chatwoot_agent_id: parsedValue })
        .eq('id', userId);

      if (error) throw error;

      toast.success("ID Chatwoot atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingChatwootId(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    } catch (error) {
      console.error('Erro ao salvar ID Chatwoot:', error);
      toast.error("Erro ao salvar ID Chatwoot");
    } finally {
      setSavingChatwootId(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'master': return 'destructive';
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'agent': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'master': return '👑 Master';
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'agent': return 'Agente';
      case 'viewer': return 'Visualizador';
      default: return role;
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return { variant: 'outline' as const, label: 'Desconhecido', icon: null };
    
    switch (status) {
      case 'pending':
        return { variant: 'secondary' as const, label: 'Pendente', icon: <Clock className="h-3 w-3" /> };
      case 'approved':
        return { variant: 'default' as const, label: 'Aprovado', icon: <CheckCircle className="h-3 w-3" /> };
      case 'blocked':
        return { variant: 'destructive' as const, label: 'Bloqueado', icon: <XCircle className="h-3 w-3" /> };
      default:
        return { variant: 'outline' as const, label: status, icon: null };
    }
  };

  const filteredUsers = users?.filter(user => {
    if (statusTab === 'todos') return true;
    return user.status === statusTab;
  }) || [];

  if (permissionsLoading) {
    return <div className="p-4">Carregando permissões...</div>;
  }

  if (!isAdmin) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Acesso Restrito</AlertTitle>
        <AlertDescription>
          Apenas administradores podem gerenciar usuários.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">👥 Gestão de Usuários</h2>
          <p className="text-muted-foreground">Aprove usuários e gerencie permissões</p>
        </div>
        <Button onClick={() => setCreateUserModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <Tabs value={statusTab} onValueChange={(v) => setStatusTab(v as typeof statusTab)}>
        <TabsList>
          <TabsTrigger value="todos">Todos ({users?.length || 0})</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({users?.filter(u => u.status === 'pending').length || 0})</TabsTrigger>
          <TabsTrigger value="approved">Aprovados ({users?.filter(u => u.status === 'approved').length || 0})</TabsTrigger>
          <TabsTrigger value="blocked">Bloqueados ({users?.filter(u => u.status === 'blocked').length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value={statusTab} className="mt-6">
          {isLoading ? (
            <div className="text-center p-8">
              <p className="text-muted-foreground">Carregando usuários...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center p-8 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>ID Chatwoot</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.nome || '—'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            placeholder="ID"
                            className="w-20 h-8 text-sm"
                            value={editingChatwootId[user.id] ?? (user.chatwoot_agent_id?.toString() || '')}
                            onChange={(e) => setEditingChatwootId(prev => ({ ...prev, [user.id]: e.target.value }))}
                          />
                          {editingChatwootId[user.id] !== undefined && 
                           editingChatwootId[user.id] !== (user.chatwoot_agent_id?.toString() || '') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleSaveChatwootId(user.id, user.chatwoot_agent_id)}
                              disabled={savingChatwootId === user.id}
                            >
                              <Save className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role || 'agent')}>
                          {getRoleLabel(user.role || 'agent')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const statusInfo = getStatusBadge(user.status);
                          return (
                            <Badge variant={statusInfo.variant} className="gap-1">
                              {statusInfo.icon}
                              {statusInfo.label}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {user.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => updateUserStatus.mutate({ userId: user.id, status: 'approved' })}
                                disabled={updateUserStatus.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateUserStatus.mutate({ userId: user.id, status: 'blocked' })}
                                disabled={updateUserStatus.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Bloquear
                              </Button>
                            </>
                          )}
                          {user.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateUserStatus.mutate({ userId: user.id, status: 'blocked' })}
                              disabled={updateUserStatus.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Bloquear
                            </Button>
                          )}
                          {user.status === 'blocked' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateUserStatus.mutate({ userId: user.id, status: 'approved' })}
                              disabled={updateUserStatus.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser({ id: user.id, nome: user.nome || user.email });
                              setGerenciarFunisOpen(true);
                            }}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Funis
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setUserForPermissions({
                                id: user.id,
                                nome: user.nome || undefined,
                                email: user.email,
                                permissions: {
                                  criar_card: user.criar_card ?? false,
                                  editar_card: user.editar_card ?? false,
                                  deletar_card: user.deletar_card ?? false,
                                  edit_funil: user.edit_funil ?? false,
                                  edit_etapas: user.edit_etapas ?? false,
                                  ver_relatorios: user.ver_relatorios ?? false,
                                  gerenciar_usuarios: user.gerenciar_usuarios ?? false,
                                  ver_cards_outros: user.ver_cards_outros ?? false,
                                }
                              });
                              setPermissionsModalOpen(true);
                            }}
                          >
                            <Key className="h-4 w-4 mr-2" />
                            Permissões
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedUser && (
        <GerenciarFunisUsuario
          open={gerenciarFunisOpen}
          onOpenChange={setGerenciarFunisOpen}
          userId={selectedUser.id}
          userName={selectedUser.nome}
        />
      )}

      {userForPermissions && (
        <PermissionsModal
          isOpen={permissionsModalOpen}
          onClose={() => {
            setPermissionsModalOpen(false);
            setUserForPermissions(null);
          }}
          user={userForPermissions}
          initialPermissions={userForPermissions.permissions}
        />
      )}

      <CreateUserModal
        isOpen={createUserModalOpen}
        onClose={() => setCreateUserModalOpen(false)}
      />
    </div>
  );
};
