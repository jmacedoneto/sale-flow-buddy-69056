import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Shield, ExternalLink, Settings, CheckCircle, XCircle, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GerenciarFunisUsuario } from "./GerenciarFunisUsuario";
import { usePermissions } from "@/hooks/usePermissions";
import { useUpdateUserStatus, type UserStatus } from "@/hooks/useUpdateUserStatus";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const AbaUsuarios = () => {
  const queryClient = useQueryClient();
  const [gerenciarFunisOpen, setGerenciarFunisOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; nome: string } | null>(null);
  const [statusTab, setStatusTab] = useState<'todos' | 'pending' | 'approved' | 'blocked'>('todos');

  const { isAdmin, loading: permissionsLoading } = usePermissions();
  const updateUserStatus = useUpdateUserStatus();

  // Listar usuários
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


  // Mutation para atualizar permissões
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      field, 
      value 
    }: { 
      userId: string; 
      field: 'edit_funil' | 'edit_etapas' | 'criar_card' | 'editar_card' | 'deletar_card' | 'ver_relatorios'; 
      value: boolean 
    }) => {
      const { error } = await supabase
        .from('users_crm')
        .update({ [field]: value })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Permissões atualizadas!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar permissões');
    }
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'master': return 'destructive';
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'agent': return 'secondary';
      default: return 'outline';
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

  // Filtrar usuários por status
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

  if (!isMaster) {
    return (
      <div className="text-center p-8 bg-muted rounded-lg">
        <p className="text-muted-foreground">Apenas o master pode gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Aviso sobre nova tela */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Nova Gestão de Permissões Disponível</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Sistema completo de permissões por funil agora disponível!</span>
          <Link to="/usuarios-permissoes">
            <Button variant="outline" size="sm" className="gap-2">
              Acessar Nova Tela
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </AlertDescription>
      </Alert>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">👥 Usuários do Sistema (Legacy)</h2>
          <p className="text-muted-foreground">Gerencie os usuários e suas permissões</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center p-8">
          <p className="text-muted-foreground">Carregando usuários...</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aprovado</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead>Ações</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.nome || '—'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role || 'agent')}>
                      {getRoleLabel(user.role || 'agent')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.ativo ? 'default' : 'secondary'}>
                      {user.ativo ? '✅ Ativo' : '🔒 Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.approved ? 'default' : 'destructive'}>
                      {user.approved ? '✓ Aprovado' : '⏳ Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.role !== 'master' ? (
                      <div className="space-y-2 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={user.edit_funil || false}
                            onCheckedChange={(checked) => 
                              updatePermissionsMutation.mutate({
                                userId: user.id,
                                field: 'edit_funil',
                                value: checked as boolean
                              })
                            }
                            disabled={updatePermissionsMutation.isPending}
                          />
                          <span className="text-xs">Editar Funil</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={user.edit_etapas || false}
                            onCheckedChange={(checked) => 
                              updatePermissionsMutation.mutate({
                                userId: user.id,
                                field: 'edit_etapas',
                                value: checked as boolean
                              })
                            }
                            disabled={updatePermissionsMutation.isPending}
                          />
                          <span className="text-xs">Editar Etapas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={user.criar_card || false}
                            onCheckedChange={(checked) => 
                              updatePermissionsMutation.mutate({
                                userId: user.id,
                                field: 'criar_card',
                                value: checked as boolean
                              })
                            }
                            disabled={updatePermissionsMutation.isPending}
                          />
                          <span className="text-xs">Criar Card</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={user.editar_card || false}
                            onCheckedChange={(checked) => 
                              updatePermissionsMutation.mutate({
                                userId: user.id,
                                field: 'editar_card',
                                value: checked as boolean
                              })
                            }
                            disabled={updatePermissionsMutation.isPending}
                          />
                          <span className="text-xs">Editar Card</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={user.deletar_card || false}
                            onCheckedChange={(checked) => 
                              updatePermissionsMutation.mutate({
                                userId: user.id,
                                field: 'deletar_card',
                                value: checked as boolean
                              })
                            }
                            disabled={updatePermissionsMutation.isPending}
                          />
                          <span className="text-xs">Deletar Card</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={user.ver_relatorios || false}
                            onCheckedChange={(checked) => 
                              updatePermissionsMutation.mutate({
                                userId: user.id,
                                field: 'ver_relatorios',
                                value: checked as boolean
                              })
                            }
                            disabled={updatePermissionsMutation.isPending}
                          />
                          <span className="text-xs">Ver Relatórios</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Todas</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {!user.approved && (
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(user.id)}
                          disabled={approveMutation.isPending}
                        >
                          ✓ Aprovar
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
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedUser && (
        <GerenciarFunisUsuario
          open={gerenciarFunisOpen}
          onOpenChange={setGerenciarFunisOpen}
          userId={selectedUser.id}
          userName={selectedUser.nome}
        />
      )}
    </div>
  );
};
