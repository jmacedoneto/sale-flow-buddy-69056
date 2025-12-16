import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Key, ExternalLink, Code2, Zap, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ApiDocs = () => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const projectUrl = import.meta.env.VITE_SUPABASE_URL;

  const handleGenerateApiKey = async () => {
    if (!user?.id) return;
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('api-key-auth', {
        body: { action: 'generate', name: 'API Key - ' + new Date().toLocaleDateString() }
      });

      if (error) throw error;
      
      if (data?.apiKey) {
        setApiKey(data.apiKey);
        toast.success("API Key gerada com sucesso! Guarde-a em local seguro.");
      }
    } catch (error: any) {
      toast.error("Erro ao gerar API Key: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const endpoints = [
    {
      method: "POST",
      path: "/api/v1/cards/move",
      description: "Move um card para outra etapa do funil",
      body: {
        cardId: "uuid",
        newStageId: "uuid",
        funilId: "uuid (opcional)"
      },
      response: {
        success: true,
        card: { id: "...", etapa_id: "..." }
      }
    },
    {
      method: "GET",
      path: "/api/v1/cards",
      description: "Lista todos os cards (com filtros opcionais)",
      query: "?funilId=uuid&etapaId=uuid&status=aberto",
      response: {
        success: true,
        cards: ["..."]
      }
    },
    {
      method: "GET",
      path: "/api/v1/cards/:id",
      description: "Retorna detalhes de um card específico",
      response: {
        success: true,
        card: { id: "...", titulo: "...", etapa_id: "..." }
      }
    },
    {
      method: "POST",
      path: "/api/v1/cards",
      description: "Cria um novo card",
      body: {
        titulo: "string",
        funilId: "uuid",
        etapaId: "uuid",
        resumo: "string (opcional)"
      },
      response: {
        success: true,
        card: { id: "..." }
      }
    },
    {
      method: "PATCH",
      path: "/api/v1/cards/:id",
      description: "Atualiza um card existente",
      body: {
        titulo: "string (opcional)",
        resumo: "string (opcional)",
        status: "string (opcional)"
      },
      response: {
        success: true,
        card: { id: "..." }
      }
    }
  ];

  const n8nExample = `// Exemplo de nó HTTP Request no N8n
{
  "method": "POST",
  "url": "${projectUrl}/functions/v1/cards-api",
  "headers": {
    "Content-Type": "application/json",
    "x-api-key": "sua_api_key_aqui"
  },
  "body": {
    "action": "move",
    "cardId": "{{$json.cardId}}",
    "newStageId": "{{$json.novaEtapaId}}"
  }
}`;

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <Code2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Documentação da API</h1>
            <p className="text-muted-foreground">
              Integre sistemas externos via API REST
            </p>
          </div>
        </div>
      </div>

      {/* API Key Section */}
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Autenticação
          </CardTitle>
          <CardDescription>
            Todas as requisições devem incluir o header <code className="bg-muted px-1 rounded">x-api-key</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm font-medium text-success">API Key gerada com sucesso!</span>
              </div>
              <div className="flex gap-2">
                <Input 
                  value={apiKey} 
                  readOnly 
                  className="font-mono text-sm bg-muted/50"
                />
                <Button 
                  size="icon" 
                  variant="outline"
                  onClick={() => copyToClipboard(apiKey, "API Key")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-destructive font-medium">
                ⚠️ Guarde esta chave! Ela não será exibida novamente.
              </p>
            </div>
          ) : (
            <Button 
              onClick={handleGenerateApiKey} 
              disabled={isGenerating}
              className="gap-2"
            >
              <Key className="h-4 w-4" />
              {isGenerating ? "Gerando..." : "Gerar Nova API Key"}
            </Button>
          )}

          <div className="p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm font-medium mb-2">Exemplo de Header:</p>
            <code className="text-xs bg-background p-2 rounded block">
              x-api-key: apvs_xxxxxxxxxxxxxxxxxxxx
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Base URL */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            Base URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono">
              {projectUrl}/functions/v1/cards-api
            </code>
            <Button 
              size="icon" 
              variant="outline"
              onClick={() => copyToClipboard(`${projectUrl}/functions/v1/cards-api`, "URL")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Endpoints Disponíveis
        </h2>

        {endpoints.map((endpoint, index) => (
          <Card key={index} className="glass-card overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Badge 
                  variant={endpoint.method === "GET" ? "secondary" : "default"}
                  className="font-mono"
                >
                  {endpoint.method}
                </Badge>
                <code className="text-sm font-mono text-foreground">
                  {endpoint.path}
                </code>
              </div>
              <CardDescription>{endpoint.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {endpoint.query && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Query Params:</p>
                  <code className="text-xs bg-muted p-2 rounded block">
                    {endpoint.query}
                  </code>
                </div>
              )}
              
              {endpoint.body && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Request Body:</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(endpoint.body, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Response:</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {JSON.stringify(endpoint.response, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* N8n Integration */}
      <Card className="glass-card border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            Integração com N8n
          </CardTitle>
          <CardDescription>
            Exemplo de configuração para automação com N8n
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
              {n8nExample}
            </pre>
            <Button 
              size="sm" 
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(n8nExample, "Exemplo N8n")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-accent/20">
            <h4 className="font-medium text-sm mb-2">Casos de Uso Comuns:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Mover card automaticamente quando webhook externo é acionado</li>
              <li>• Criar card a partir de formulário externo (Typeform, Google Forms)</li>
              <li>• Sincronizar status com CRM externo</li>
              <li>• Enviar notificações baseadas em mudanças de etapa</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiDocs;
