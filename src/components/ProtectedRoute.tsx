import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [approved, setApproved] = useState<boolean | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);

  useEffect(() => {
    const checkApproval = async () => {
      if (user) {
        const { data } = await supabase
          .from('users_crm')
          .select('approved')
          .eq('id', user.id)
          .single();
        
        setApproved(data?.approved ?? false);
      }
      setCheckingApproval(false);
    };

    if (!loading) {
      checkApproval();
    }
  }, [user, loading]);

  if (loading || checkingApproval) {
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

  if (approved === false) {
    return <Navigate to="/pending" replace />;
  }

  return <>{children}</>;
};