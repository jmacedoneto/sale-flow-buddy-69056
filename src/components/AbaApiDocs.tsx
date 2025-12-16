import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Key, ExternalLink, Code2, Zap, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const AbaApiDocs = () => {
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
        toast.success("API Key gerada com sucesso!");
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
      path: "/move",
      description: "Move um card para outra etapa",
      body: { cardId: "uuid", newStageId: "uuid" }
    },
    {
      method: "GET",
      path: "/list",
      description: "Lista todos os cards",
      query: "?funilId=uuid&status=aberto"
    },
    {
      method: "POST",
      path: "/create",
      description: "Cria um novo card",
      body: { titulo: "string", funilId: "uuid", etapaId: "uuid" }
    },
    {
      method: "PATCH",
      path: "/update",
      description: "Atualiza um card",
      body: { cardId: "uuid", titulo: "string" }
    }
  ];

  const n8nExample = `{
  "method": "POST",
  "url": "${projectUrl}/functions/v1/cards-api",
  "headers": {
    "Content-Type": "application/json",
    "x-api-key": "sua_api_key"
  },
  "body": {
    "action": "move",
    "cardId": "{{$json.cardId}}",
    "newStageId": "{{$json.novaEtapaId}}"
  }
}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <Code2 className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Documentação da API</h2>
          <p className="text-sm text-muted-foreground">Integre sistemas externos</p>
        </div>
      </div>

      {/* API Key */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            Autenticação
          </CardTitle>
          <CardDescription className="text-xs">
            Header: <code className="bg-muted px-1 rounded">x-api-key</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {apiKey ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm text-success">API Key gerada!</span>
              </div>
              <div className="flex gap-2">
                <Input value={apiKey} readOnly className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={() => copyToClipboard(apiKey, "API Key")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-destructive">⚠️ Guarde esta chave!</p>
            </div>
          ) : (
            <Button onClick={handleGenerateApiKey} disabled={isGenerating} size="sm">
              <Key className="h-4 w-4 mr-2" />
              {isGenerating ? "Gerando..." : "Gerar API Key"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Base URL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" />
            Base URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <code className="flex-1 p-2 bg-muted rounded text-xs font-mono truncate">
              {projectUrl}/functions/v1/cards-api
            </code>
            <Button size="icon" variant="outline" onClick={() => copyToClipboard(`${projectUrl}/functions/v1/cards-api`, "URL")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {endpoints.map((ep, i) => (
            <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={ep.method === "GET" ? "secondary" : "default"} className="text-[10px]">
                  {ep.method}
                </Badge>
                <code className="text-xs">{ep.path}</code>
              </div>
              <p className="text-xs text-muted-foreground">{ep.description}</p>
              {ep.body && (
                <pre className="text-[10px] bg-background p-2 rounded overflow-x-auto">
                  {JSON.stringify(ep.body, null, 2)}
                </pre>
              )}
              {ep.query && (
                <code className="text-[10px] bg-background px-2 py-1 rounded">{ep.query}</code>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* N8n */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Exemplo N8n
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="text-[10px] bg-muted p-3 rounded overflow-x-auto">{n8nExample}</pre>
            <Button 
              size="sm" 
              variant="ghost" 
              className="absolute top-1 right-1 h-7"
              onClick={() => copyToClipboard(n8nExample, "Exemplo")}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};