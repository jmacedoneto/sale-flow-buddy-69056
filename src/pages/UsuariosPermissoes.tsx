import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions, AppRole } from "@/hooks/usePermissions";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";
import { useFunis } from "@/hooks/useFunis";
import { Navigate } from "react-router-dom";

/**
 * Tela de gestão de usuários e permissões.
 * Permite admins configurarem roles e acessos a funis (SRP, SSOT).
 */

interface UserWithRoles {
  id: string;
  email: string;
  nome: string | null;
  roles: AppRole[];
  funil_access: Array<{
    funil_id: string;
    can_view: boolean;
    can_edit: boolean;
  }>;
}

export default function UsuariosPermissoes() {
  const { canManageUsers, loading: loadingPermissions } = usePermissions();
  const { data: funis = [] } = useFunis();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todos os usuários com seus roles e acessos
  const { data: users = [], isLoading } = useQuery<UserWithRoles[]>({
    queryKey: ['users-with-permissions'],
    queryFn: async () => {
      // Buscar usuários
      const { data: usersData, error: usersError } = await supabase
        .from('users_crm')
        .select('id, email, nome')
        .order('nome');

      if (usersError) throw usersError;

      // Buscar roles de cada usuário
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Buscar acessos de cada usuário
      const { data: accessData, error: accessError } = await supabase
        .from('user_funil_access')
        .select('user_id, funil_id, can_view, can_edit');

      if (accessError) throw accessError;

      // Combinar dados
      return usersData.map(user => ({
        ...user,
        roles: rolesData
          .filter(r => r.user_id === user.id)
          .map(r => r.role as AppRole),
        funil_access: accessData
          .filter(a => a.user_id === user.id)
          .map(a => ({
            funil_id: a.funil_id,
            can_view: a.can_view,
            can_edit: a.can_edit,
          })),
      }));
    },
    enabled: canManageUsers,
  });

  // Mutation para atualizar role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // Remover roles antigos
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Adicionar novo role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      // Se for admin, dar acesso total a todos os funis
      if (newRole === 'admin') {
        const { error: accessError } = await supabase
          .from('user_funil_access')
          .upsert(
            funis.map(f => ({
              user_id: userId,
              funil_id: f.id,
              can_view: true,
              can_edit: true,
            })),
            { onConflict: 'user_id,funil_id' }
          );

        if (accessError) throw accessError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-permissions'] });
      toast({ title: "Role atualizado com sucesso" });
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast({
        title: "Erro ao atualizar role",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar acesso a funil
  const updateFunilAccessMutation = useMutation({
    mutationFn: async ({
      userId,
      funilId,
      canView,
      canEdit,
    }: {
      userId: string;
      funilId: string;
      canView: boolean;
      canEdit: boolean;
    }) => {
      const { error } = await supabase
        .from('user_funil_access')
        .upsert(
          {
            user_id: userId,
            funil_id: funilId,
            can_view: canView,
            can_edit: canEdit,
          },
          { onConflict: 'user_id,funil_id' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-permissions'] });
    },
    onError: (error) => {
      console.error('Error updating funil access:', error);
      toast({
        title: "Erro ao atualizar acesso",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  if (loadingPermissions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManageUsers) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestão de Usuários e Permissões</h1>
            <p className="text-muted-foreground">Configure roles e acessos a funis</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4">
            {users.map(user => (
              <Card key={user.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{user.nome || user.email}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Seletor de Role */}
                  <div className="flex items-center gap-4">
                    <label className="font-medium w-24">Role:</label>
                    <Select
                      value={user.roles[0] || 'viewer'}
                      onValueChange={(value) =>
                        updateRoleMutation.mutate({
                          userId: user.id,
                          newRole: value as AppRole,
                        })
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin (Acesso Total)</SelectItem>
                        <SelectItem value="manager">Manager (Gerente)</SelectItem>
                        <SelectItem value="agent">Agent (Agente)</SelectItem>
                        <SelectItem value="viewer">Viewer (Visualizador)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Acessos a Funis (apenas se não for admin) */}
                  {user.roles[0] !== 'admin' && (
                    <div className="space-y-2">
                      <label className="font-medium">Acessos a Funis:</label>
                      <div className="grid gap-2 pl-4">
                        {funis.map(funil => {
                          const access = user.funil_access.find(a => a.funil_id === funil.id);
                          return (
                            <div key={funil.id} className="flex items-center gap-4">
                              <span className="w-48 text-sm">{funil.nome}</span>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`${user.id}-${funil.id}-view`}
                                  checked={access?.can_view || false}
                                  onCheckedChange={(checked) =>
                                    updateFunilAccessMutation.mutate({
                                      userId: user.id,
                                      funilId: funil.id,
                                      canView: !!checked,
                                      canEdit: access?.can_edit || false,
                                    })
                                  }
                                />
                                <label htmlFor={`${user.id}-${funil.id}-view`} className="text-sm">
                                  Visualizar
                                </label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`${user.id}-${funil.id}-edit`}
                                  checked={access?.can_edit || false}
                                  onCheckedChange={(checked) =>
                                    updateFunilAccessMutation.mutate({
                                      userId: user.id,
                                      funilId: funil.id,
                                      canView: access?.can_view || false,
                                      canEdit: !!checked,
                                    })
                                  }
                                />
                                <label htmlFor={`${user.id}-${funil.id}-edit`} className="text-sm">
                                  Editar
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
