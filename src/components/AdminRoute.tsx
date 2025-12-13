import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Componente de proteção de rota para usuários admin.
 * Redireciona não-admins para /dashboard.
 * Princípio: Fail Fast - bloqueia acesso antes de renderizar.
 */
export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isAdmin, loading } = usePermissions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    console.warn('[AdminRoute] Acesso negado - usuário não é admin');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
