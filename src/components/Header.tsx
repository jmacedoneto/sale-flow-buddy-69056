import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, LayoutDashboard, FileText, BarChart3, Wrench, Circle } from "lucide-react";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { cn } from "@/lib/utils";

export const Header = () => {
  const location = useLocation();
  const { data: healthStatus } = useSystemHealth();

  const chatwootHealth = healthStatus?.find(h => h.service === 'chatwoot');
  const isHealthy = chatwootHealth?.status === 'operational';

  const navItems = [
    { path: "/dashboard-comercial", label: "Comercial", icon: BarChart3 },
    { path: "/dashboard-administrativo", label: "Administrativo", icon: Wrench },
    { path: "/atividades", label: "Atividades", icon: FileText },
    { path: "/configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <header className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo e Status */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg md:text-xl font-bold text-foreground">CRM APVS</h1>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Iguatemi
                </p>
              </div>
            </Link>
            
            {/* Status Chatwoot */}
            <div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1 rounded-full bg-muted">
              <Circle 
                className={cn(
                  "h-2 w-2",
                  isHealthy ? "fill-green-500 text-green-500" : "fill-red-500 text-red-500"
                )} 
              />
              <span className="text-xs text-muted-foreground">
                {isHealthy ? "Chatwoot OK" : "Chatwoot offline"}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Menu */}
          <div className="flex md:hidden">
            <Link to="/configuracoes">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
