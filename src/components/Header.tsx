import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, ArrowLeft } from "lucide-react";

export const Header = () => {
  const location = useLocation();
  const isHome = location.pathname === "/dashboard";

  return (
    <header className="border-b border-border bg-card sticky top-0 z-10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isHome && (
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              </Link>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard CRM</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Sistema de gestão de relacionamento com clientes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/configuracoes">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
