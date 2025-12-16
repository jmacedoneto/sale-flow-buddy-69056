import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, LayoutDashboard, BarChart3, Wrench, ListTodo, Menu, UserCircle, Key, LogOut } from "lucide-react";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "./ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  const { data: healthStatus } = useSystemHealth();
  const { isAdmin } = usePermissions();
  const { user } = useAuth();
  const [userData, setUserData] = useState<{ nome: string | null; avatar_url: string | null } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso!");
      navigate("/auth");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error("Erro ao fazer logout");
    }
  };

  const chatwootHealth = healthStatus?.find(h => h.service === 'chatwoot');
  const isHealthy = chatwootHealth?.status === 'operational';

  const allNavItems = [
    { path: "/dashboard", label: "Pipeline", icon: LayoutDashboard },
    { path: "/atividades", label: "Atividades", icon: ListTodo },
    { path: "/dashboard-comercial", label: "Comercial", icon: BarChart3 },
    { path: "/dashboard-administrativo", label: "Administrativo", icon: Wrench },
    { path: "/configuracoes", label: "Configurações", icon: Settings, requireAdmin: true },
  ];

  const navItems = allNavItems.filter(item => !item.requireAdmin || isAdmin);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
      <div className="px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo e Status */}
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg group-hover:shadow-primary/25 transition-shadow">
                <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Gestão APVS
                </h1>
                <p className="text-[10px] text-muted-foreground font-medium -mt-0.5">
                  IGUATEMI
                </p>
              </div>
            </Link>
            
            {/* Status Chatwoot */}
            <div className={cn(
              "hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors",
              isHealthy 
                ? "bg-success/10 border-success/30 text-success" 
                : "bg-destructive/10 border-destructive/30 text-destructive"
            )}>
              <span className={cn(
                "h-2 w-2 rounded-full animate-pulse",
                isHealthy ? "bg-success" : "bg-destructive"
              )} />
              <span className="text-xs font-medium">
                {isHealthy ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "gap-2 rounded-lg transition-all",
                      active && "bg-primary/10 text-primary hover:bg-primary/15"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Theme Toggle & User Avatar */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 border-2 border-primary/20 cursor-pointer hover:border-primary/50 transition-colors">
                  {userData?.avatar_url ? (
                    <AvatarImage src={userData.avatar_url} alt={userData.nome || 'Usuário'} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getInitials(userData?.nome || user?.email || '')}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg z-[100]">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userData?.nome || 'Usuário'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/configuracoes?tab=perfil')} className="cursor-pointer">
                  <UserCircle className="h-4 w-4 mr-2" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/configuracoes?tab=senha')} className="cursor-pointer">
                  <Key className="h-4 w-4 mr-2" />
                  Alterar Senha
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <nav className="flex flex-col gap-2 mt-6">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    
                    return (
                      <Link 
                        key={item.path} 
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start gap-3",
                            active && "bg-primary/10 text-primary"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                  <div className="border-t border-border my-2" />
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-destructive hover:text-destructive"
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};
