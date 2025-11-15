import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Hook para gerenciar permissões do usuário.
 * Segue o princípio de separação de lógica de negócio da UI.
 */

export type AppRole = 'admin' | 'manager' | 'agent' | 'viewer';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

interface FunilAccess {
  id: string;
  user_id: string;
  funil_id: string;
  can_view: boolean;
  can_edit: boolean;
}

export const usePermissions = () => {
  const { user } = useAuth();

  // Buscar roles do usuário
  const { data: userRoles = [], isLoading: loadingRoles } = useQuery<UserRole[]>({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching user roles:', error);
        throw error;
      }
      
      return data as UserRole[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Buscar acessos a funis
  const { data: funilAccess = [], isLoading: loadingAccess } = useQuery<FunilAccess[]>({
    queryKey: ['funil-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_funil_access')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching funil access:', error);
        throw error;
      }
      
      return data as FunilAccess[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Derivar dados úteis
  const roles = userRoles.map(r => r.role);
  const allowedFunilIds = funilAccess
    .filter(f => f.can_view)
    .map(f => f.funil_id);
  const editableFunilIds = funilAccess
    .filter(f => f.can_edit)
    .map(f => f.funil_id);

  // Helpers
  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  const canViewFunil = (funilId: string): boolean => {
    if (hasRole('admin')) return true;
    return allowedFunilIds.includes(funilId);
  };

  const canEditFunil = (funilId: string): boolean => {
    if (hasRole('admin')) return true;
    return editableFunilIds.includes(funilId);
  };

  const canManageUsers = (): boolean => {
    return hasRole('admin');
  };

  const canManageFunis = (): boolean => {
    return hasRole('admin');
  };

  const isAdmin = hasRole('admin');
  const isManager = hasRole('manager');
  const isAgent = hasRole('agent');
  const isViewer = hasRole('viewer');

  return {
    roles,
    allowedFunilIds,
    editableFunilIds,
    hasRole,
    canViewFunil,
    canEditFunil,
    canManageUsers,
    canManageFunis,
    isAdmin,
    isManager,
    isAgent,
    isViewer,
    loading: loadingRoles || loadingAccess,
  };
};
