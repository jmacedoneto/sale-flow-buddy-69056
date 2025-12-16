import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  ListTodo, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  BarChart3,
  PauseCircle,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface AppLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { 
    path: "/dashboard", 
    label: "Pipeline", 
    icon: LayoutDashboard,
    description: "Kanban de negociações"
  },
  { 
    path: "/atividades", 
    label: "Atividades", 
    icon: ListTodo,
    description: "Tarefas e follow-ups"
  },
  { 
    path: "/dashboard-comercial", 
    label: "Comercial", 
    icon: BarChart3,
    description: "Dashboard comercial"
  },
  { 
    path: "/dashboard-administrativo", 
    label: "Administrativo", 
    icon: BarChart3,
    description: "Dashboard administrativo"
  },
  { 
    path: "/negociacoes-pausadas", 
    label: "Pausados", 
    icon: PauseCircle,
    description: "Negociações pausadas"
  },
  { 
    path: "/configuracoes", 
    label: "Configurações", 
    icon: Settings,
    description: "Configurações do sistema"
  },
];

const getInitials = (name: string): string => {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user: authUser } = useAuth();

  // Buscar dados do usuário do CRM
  const { data: userCrm } = useQuery({
    queryKey: ['user-crm', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) return null;
      const { data } = await supabase
        .from('users_crm')
        .select('nome, avatar_url, email')
        .eq('id', authUser.id)
        .single();
      return data;
    },
    enabled: !!authUser?.id,
  });

  // Fechar sidebar mobile ao mudar de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Carregar estado do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) setCollapsed(JSON.parse(saved));
  }, []);

  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Overlay para mobile */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header da Sidebar */}
        <div className={cn(
          "flex items-center h-16 border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                APVS
              </span>
              <span className="text-[10px] text-sidebar-foreground/60 -mt-1">
                IGUATEMI
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hidden lg:flex"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <TooltipProvider delayDuration={0}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                        active 
                          ? "bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border border-primary/20 shadow-sm" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary")} />
                      {!collapsed && (
                        <span className="text-sm font-medium truncate">{item.label}</span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="flex flex-col">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>

        {/* User Section */}
        <div className={cn(
          "p-3 border-t border-sidebar-border",
          collapsed && "flex justify-center"
        )}>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-3 p-2 rounded-xl hover:bg-sidebar-accent transition-colors cursor-pointer",
                  collapsed && "p-0"
                )}>
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                    <AvatarImage src={userCrm?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                      {getInitials(userCrm?.nome || authUser?.email || '')}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sidebar-foreground truncate">
                        {userCrm?.nome || 'Usuário'}
                      </p>
                      <p className="text-xs text-sidebar-foreground/60 truncate">
                        {userCrm?.email || authUser?.email}
                      </p>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  <p className="font-medium">{userCrm?.nome || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground">{userCrm?.email || authUser?.email}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center h-14 px-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="mr-3"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Gestão APVS IGUATEMI
          </span>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
