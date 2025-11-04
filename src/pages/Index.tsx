import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, MessageSquare, Zap, LogOut } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast.success('Logout realizado com sucesso!');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header com Logout */}
      <div className="container mx-auto px-6 py-4 flex justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-12">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 bg-gradient-primary bg-clip-text text-transparent">
            CRM Inteligente
          </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Gerencie suas conversas e funis de vendas de forma simples e eficiente
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Button 
            size="lg" 
            className="gap-2 shadow-elegant text-lg px-8"
            onClick={() => navigate('/dashboard')}
          >
            Acessar Dashboard
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Link to="/dashboard-comercial">
            <Button variant="outline" size="sm" className="gap-2">
              📊 Comercial
            </Button>
          </Link>
          <Link to="/dashboard-administrativo">
            <Button variant="outline" size="sm" className="gap-2">
              ⚙️ Administrativo
            </Button>
          </Link>
          <Link to="/configuracoes">
            <Button variant="outline" size="sm" className="gap-2">
              ⚙️ Configurações
            </Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
        <div className="text-center p-6 rounded-lg bg-card shadow-card hover:shadow-elegant transition-shadow">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Conversas Organizadas</h3>
          <p className="text-muted-foreground text-sm">
            Gerencie todas as suas conversas em um só lugar com integração Chatwoot
          </p>
        </div>

        <div className="text-center p-6 rounded-lg bg-card shadow-card hover:shadow-elegant transition-shadow">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Funis Personalizados</h3>
          <p className="text-muted-foreground text-sm">
            Crie funis customizados para diferentes processos de vendas
          </p>
        </div>

        <div className="text-center p-6 rounded-lg bg-card shadow-card hover:shadow-elegant transition-shadow">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
            <Zap className="h-6 w-4" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Automação Inteligente</h3>
          <p className="text-muted-foreground text-sm">
            Automatize tarefas repetitivas e foque no que realmente importa
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Index;
