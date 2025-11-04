import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const MASTER_EMAIL = 'jmacedoneto1989@gmail.com';

export const AbaUsuarios = () => {
  const queryClient = useQueryClient();

  // Verificar se usuário é master
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      
      const { data } = await supabase
        .from('users_crm')
        .select('role, email')
        .eq('id', user.id)
        .single();
      
      return { ...user, role: data?.role, email: data?.email };
    }
  });

  const isMaster = currentUser?.role === 'master' || currentUser?.email === MASTER_EMAIL;

  // Listar usuários
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (!isMaster) return [];

      const { data, error } = await supabase
        .from('users_crm')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isMaster
  });

  // Mutation para aprovar usuário
  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('users_crm')
        .update({ approved: true })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Usuário aprovado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao aprovar usuário');
    }
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

  if (!isMaster) {
    return (
      <div className="text-center p-8 bg-muted rounded-lg">
        <p className="text-muted-foreground">Apenas o master pode gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">👥 Usuários do Sistema</h2>
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
                  <TableCell>
                    {!user.approved && (
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(user.id)}
                        disabled={approveMutation.isPending}
                      >
                        ✓ Aprovar
                      </Button>
                    )}
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
    </div>
  );
};
