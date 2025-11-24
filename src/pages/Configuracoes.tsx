import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AbaConfigChatwoot } from "@/components/AbaConfigChatwoot";
import { AbaWebhooks } from "@/components/AbaWebhooks";
import { AbaWebhooksExternos } from "@/components/AbaWebhooksExternos";
import { AbaMappings } from "@/components/AbaMappings";
import { AbaUsuarios } from "@/components/AbaUsuarios";
import { AbaMonitoramento } from "@/components/AbaMonitoramento";
import { AbaConfigIA } from "@/components/AbaConfigIA";
import { AbaProdutos } from "@/components/AbaProdutos";
import { AbaMotivosPerda } from "@/components/AbaMotivosPerda";
import { AbaKanbanColors } from "@/components/AbaKanbanColors";
import { AbaFunis } from "@/components/AbaFunis";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

const Configuracoes = () => {
  const { isAdmin, loading } = usePermissions();

  // Mostrar loading enquanto verifica permissões
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // Renderizar mensagem de acesso negado (sem redirecionamento)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar as configurações do sistema.
            Entre em contato com um administrador para solicitar acesso.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">⚙️ Configurações</h1>
        
        <Tabs defaultValue="chatwoot" className="w-full">
          <TabsList className="grid w-full grid-cols-11">
            <TabsTrigger value="chatwoot">Chatwoot</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks Internos</TabsTrigger>
            <TabsTrigger value="externos">Webhooks Externos</TabsTrigger>
            <TabsTrigger value="mappings">Mappings</TabsTrigger>
            <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
            <TabsTrigger value="ia">IA</TabsTrigger>
            <TabsTrigger value="funis">Funis</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="motivos-perda">Motivos de Perda</TabsTrigger>
            <TabsTrigger value="kanban-colors">Cores Kanban</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          </TabsList>

          <TabsContent value="chatwoot" className="mt-6">
            <AbaConfigChatwoot />
          </TabsContent>

          <TabsContent value="webhooks" className="mt-6">
            <AbaWebhooks />
          </TabsContent>

          <TabsContent value="externos" className="mt-6">
            <AbaWebhooksExternos />
          </TabsContent>

          <TabsContent value="mappings" className="mt-6">
            <AbaMappings />
          </TabsContent>

          <TabsContent value="monitoramento" className="mt-6">
            <AbaMonitoramento />
          </TabsContent>

          <TabsContent value="ia" className="mt-6">
            <AbaConfigIA />
          </TabsContent>

          <TabsContent value="funis" className="mt-6">
            <AbaFunis />
          </TabsContent>

          <TabsContent value="produtos" className="mt-6">
            <AbaProdutos />
          </TabsContent>

          <TabsContent value="motivos-perda" className="mt-6">
            <AbaMotivosPerda />
          </TabsContent>

          <TabsContent value="kanban-colors" className="mt-6">
            <AbaKanbanColors />
          </TabsContent>

          <TabsContent value="usuarios" className="mt-6">
            <AbaUsuarios />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default Configuracoes;
