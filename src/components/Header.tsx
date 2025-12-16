import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, LayoutDashboard, FileText, BarChart3, Wrench, Circle, User } from "lucide-react";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const Header = () => {
  const location = useLocation();
  const { data: healthStatus } = useSystemHealth();
  const { isAdmin } = usePermissions();
  const { user } = useAuth();
  const [userData, setUserData] = useState<{ nome: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('users_crm')
        .select('nome, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (data) setUserData(data);
    };

    fetchUserData();
  }, [user?.id]);

  const chatwootHealth = healthStatus?.find(h => h.service === 'chatwoot');
  const isHealthy = chatwootHealth?.status === 'operational';

  const allNavItems = [
    { path: "/dashboard-comercial", label: "Comercial", icon: BarChart3, requireAdmin: false },
    { path: "/dashboard-administrativo", label: "Administrativo", icon: Wrench, requireAdmin: false },
    { path: "/atividades", label: "Atividades", icon: FileText, requireAdmin: false },
    { path: "/configuracoes", label: "Configurações", icon: Settings, requireAdmin: true },
  ];

  const navItems = allNavItems.filter(item => !item.requireAdmin || isAdmin);

  return (
    <header className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo e Status */}
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
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

          {/* User Avatar e Mobile Menu */}
          <div className="flex items-center gap-3">
            {/* Avatar do usuário logado */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/configuracoes">
                    <Avatar className="h-8 w-8 border-2 border-primary/20 cursor-pointer hover:border-primary/50 transition-colors">
                      {userData?.avatar_url ? (
                        <AvatarImage src={userData.avatar_url} alt={userData.nome || 'Usuário'} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {getInitials(userData?.nome || user?.email || '')}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{userData?.nome || user?.email}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Mobile Menu */}
            <div className="flex md:hidden">
              {isAdmin && (
                <Link to="/configuracoes">
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};