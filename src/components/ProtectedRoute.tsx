import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { loading: permissionsLoading } = usePermissions();
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user?.email) {
        setStatusLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users_crm')
          .select('status')
          .eq('email', user.email)
          .single();

        if (error) {
          console.error("Erro ao verificar status:", error);
          // Se não encontrar usuário, criar com status pending
          if (error.code === 'PGRST116') {
            setUserStatus('pending');
          }
        } else {
          setUserStatus(data?.status || 'pending');
        }
      } catch (err) {
        console.error("Erro ao verificar status do usuário:", err);
      } finally {
        setStatusLoading(false);
      }
    };

    if (user) {
      checkUserStatus();
    } else {
      setStatusLoading(false);
    }
  }, [user]);

  if (authLoading || permissionsLoading || statusLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirecionar para /pending se usuário não está aprovado
  if (userStatus && userStatus !== 'approved') {
    return <Navigate to="/pending" replace />;
  }

  return <>{children}</>;
};
