import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AbaConfigChatwoot } from "@/components/AbaConfigChatwoot";
import { AbaWebhooks } from "@/components/AbaWebhooks";
import { AbaWebhooksExternos } from "@/components/AbaWebhooksExternos";
import { AbaMappings } from "@/components/AbaMappings";
import { AbaUsuarios } from "@/components/AbaUsuarios";
import { AbaMonitoramento } from "@/components/AbaMonitoramento";
import { AbaConfigIA } from "@/components/AbaConfigIA";
import { AbaLeadScore } from "@/components/AbaLeadScore";
import { AbaProdutos } from "@/components/AbaProdutos";
import { AbaMotivosPerda } from "@/components/AbaMotivosPerda";
import { AbaKanbanColors } from "@/components/AbaKanbanColors";
import { AbaFunis } from "@/components/AbaFunis";
import { AbaPerfilUsuario } from "@/components/AbaPerfilUsuario";
import { AbaAlterarSenha } from "@/components/AbaAlterarSenha";
import { AbaApiDocs } from "@/components/AbaApiDocs";
import { AbaAutomacoes } from "@/components/AbaAutomacoes";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  Webhook, 
  ExternalLink, 
  GitBranch,
  Activity,
  Bot,
  Users,
  Filter,
  Package,
  XCircle,
  Palette,
  Settings,
  UserCircle,
  Code,
  Key,
  Zap,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface MenuCategory {
  title: string;
  items: MenuItem[];
  adminOnly?: boolean;
}

// Menu completo para admins
const fullMenuCategories: MenuCategory[] = [
  {
    title: "Pessoal",
    items: [
      { id: "perfil", label: "Meu Perfil", icon: UserCircle },
      { id: "senha", label: "Alterar Senha", icon: Key },
    ]
  },
  {
    title: "Integrações",
    items: [
      { id: "chatwoot", label: "Chatwoot", icon: MessageSquare },
      { id: "webhooks", label: "Webhooks Internos", icon: Webhook },
      { id: "externos", label: "Webhooks Externos", icon: ExternalLink },
      { id: "mappings", label: "Mappings", icon: GitBranch },
    ],
    adminOnly: true
  },
  {
    title: "Sistema",
    items: [
      { id: "monitoramento", label: "Monitoramento", icon: Activity },
      { id: "automacoes", label: "Automações", icon: Zap },
      { id: "lead-score", label: "Lead Score", icon: Flame },
      { id: "ia", label: "Inteligência Artificial", icon: Bot },
    ],
    adminOnly: true
  },
  {
    title: "Pipeline",
    items: [
      { id: "funis", label: "Funis", icon: Filter },
      { id: "produtos", label: "Produtos", icon: Package },
      { id: "motivos-perda", label: "Motivos de Perda", icon: XCircle },
      { id: "kanban-colors", label: "Cores Kanban", icon: Palette },
    ],
    adminOnly: true
  },
  {
    title: "Administração",
    items: [
      { id: "usuarios", label: "Usuários", icon: Users },
    ],
    adminOnly: true
  },
  {
    title: "Desenvolvimento",
    items: [
      { id: "api-docs", label: "API Docs", icon: Code },
    ],
    adminOnly: true
  }
];

// Menu limitado para usuários comuns
const userMenuCategories: MenuCategory[] = [
  {
    title: "Pessoal",
    items: [
      { id: "perfil", label: "Meu Perfil", icon: UserCircle },
      { id: "senha", label: "Alterar Senha", icon: Key },
    ]
  }
];

const Configuracoes = () => {
  const { isAdmin, loading } = usePermissions();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("perfil");

  // Definir aba ativa baseado no query param
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Selecionar menu baseado nas permissões
  const menuCategories = useMemo(() => {
    return isAdmin ? fullMenuCategories : userMenuCategories;
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const renderContent = () => {
    // Abas disponíveis para todos
    if (activeTab === "perfil") return <AbaPerfilUsuario />;
    if (activeTab === "senha") return <AbaAlterarSenha />;
    
    // Abas apenas para admin
    if (!isAdmin) return <AbaPerfilUsuario />;
    
    switch (activeTab) {
      case "chatwoot": return <AbaConfigChatwoot />;
      case "webhooks": return <AbaWebhooks />;
      case "externos": return <AbaWebhooksExternos />;
      case "mappings": return <AbaMappings />;
      case "monitoramento": return <AbaMonitoramento />;
      case "automacoes": return <AbaAutomacoes />;
      case "lead-score": return <AbaLeadScore />;
      case "ia": return <AbaConfigIA />;
      case "funis": return <AbaFunis />;
      case "produtos": return <AbaProdutos />;
      case "motivos-perda": return <AbaMotivosPerda />;
      case "kanban-colors": return <AbaKanbanColors />;
      case "usuarios": return <AbaUsuarios />;
      case "api-docs": return <AbaApiDocs />;
      default: return <AbaPerfilUsuario />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar de navegação */}
        <aside className="w-64 min-h-screen border-r border-border bg-card/50 p-4 space-y-6">
          <div className="flex items-center gap-2 px-2 py-3 border-b border-border">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Configurações</h1>
          </div>

          <nav className="space-y-6">
            {menuCategories.map((category) => (
              <div key={category.title} className="space-y-1">
                <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {category.title}
                </h3>
                <div className="space-y-0.5">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                          isActive 
                            ? "bg-primary text-primary-foreground font-medium" 
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Área de conteúdo principal */}
        <main className="flex-1 p-6">
          <div className="max-w-5xl">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Configuracoes;
