import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Key, ExternalLink, Code2, Zap, Shield, CheckCircle2, Bot, Webhook } from "lucide-react";
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
      const { data, error } = await supabase.functions.invoke('api-key-auth/generate', {
        body: { name: 'API Key - ' + new Date().toLocaleDateString() }
      });

      if (error) throw error;
      
      if (data?.api_key) {
        setApiKey(data.api_key);
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

  // Endpoints básicos
  const basicEndpoints = [
    {
      method: "POST",
      path: "/move",
      description: "Move um card para outra etapa",
      body: { action: "move", cardId: "uuid", newStageId: "uuid" }
    },
    {
      method: "POST",
      path: "/list",
      description: "Lista todos os cards",
      body: { action: "list", funilId: "uuid (opcional)", status: "aberto (opcional)", limit: 50 }
    },
    {
      method: "POST",
      path: "/get",
      description: "Busca um card por ID",
      body: { action: "get", cardId: "uuid" }
    },
    {
      method: "POST",
      path: "/create",
      description: "Cria um novo card",
      body: { action: "create", titulo: "string", funilId: "uuid", etapaId: "uuid" }
    },
    {
      method: "POST",
      path: "/update",
      description: "Atualiza um card",
      body: { action: "update", cardId: "uuid", titulo: "string" }
    }
  ];

  // Novos endpoints para Agentes IA
  const aiEndpoints = [
    {
      method: "POST",
      path: "/getByConversation",
      description: "Busca card por ID da conversa Chatwoot",
      body: { action: "getByConversation", conversationId: 4406 },
      response: { success: true, card: { id: "uuid", titulo: "João Silva", funil_nome: "Comercial" } }
    },
    {
      method: "POST",
      path: "/createFromConversation",
      description: "Cria card vinculado a uma conversa Chatwoot",
      body: { 
        action: "createFromConversation",
        conversationId: 4406,
        titulo: "João Silva",
        telefone: "+5571999999999",
        avatarUrl: "https://...",
        funilId: "uuid-do-funil",
        etapaId: "uuid-da-etapa"
      },
      response: { success: true, card: { id: "uuid", titulo: "João Silva" } }
    },
    {
      method: "POST",
      path: "/createActivity",
      description: "Cria atividade/follow-up para um card. Se funil contém 'comercial', cria FOLLOW_UP. Senão, cria NOTA_ADMIN (privada).",
      body: { 
        action: "createActivity",
        conversationId: 4406,
        tipo: "FOLLOW_UP (opcional)",
        descricao: "Retornar sobre proposta",
        dataPrevista: "2026-02-05 (opcional, auto +3 dias úteis se comercial)",
        funilNome: "Comercial (opcional, detecta automaticamente)"
      },
      response: { success: true, activity: { id: "uuid", tipo: "FOLLOW_UP", data_prevista: "2026-02-05" } }
    },
    {
      method: "POST",
      path: "/listFunnels",
      description: "Lista todos os funis e etapas disponíveis",
      body: { action: "listFunnels" },
      response: { 
        success: true, 
        funnels: [
          { id: "uuid-1", nome: "Comercial", etapas: [{ id: "uuid-e1", nome: "Novo Lead", ordem: 1 }] }
        ] 
      }
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

  const aiFlowExample = `# Fluxo do Agente IA

1. Listar funis disponíveis
   → POST /listFunnels

2. Verificar se conversa já tem card
   → POST /getByConversation { conversationId: 4406 }

3. Se card não existe, criar
   → POST /createFromConversation { conversationId, titulo, funilId, etapaId }

4. Criar follow-up/atividade
   → POST /createActivity { conversationId, descricao, funilNome: "Comercial" }

# Lógica de Atividades:
- funilNome contém "comercial" → FOLLOW_UP + data_prevista (+3 dias úteis)
- Outros funis → NOTA_ADMIN (privado: true)`;

  const curlExamples = `# 1. Listar funis disponíveis
curl -X POST ${projectUrl}/functions/v1/cards-api \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sua_api_key" \\
  -d '{"action": "listFunnels"}'

# 2. Verificar se conversa já tem card
curl -X POST ${projectUrl}/functions/v1/cards-api \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sua_api_key" \\
  -d '{"action": "getByConversation", "conversationId": 4406}'

# 3. Criar card para conversa
curl -X POST ${projectUrl}/functions/v1/cards-api \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sua_api_key" \\
  -d '{
    "action": "createFromConversation",
    "conversationId": 4406,
    "titulo": "João Silva",
    "telefone": "+5571999999999",
    "funilId": "uuid-do-funil",
    "etapaId": "uuid-da-etapa"
  }'

# 4. Criar follow-up comercial
curl -X POST ${projectUrl}/functions/v1/cards-api \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sua_api_key" \\
  -d '{
    "action": "createActivity",
    "conversationId": 4406,
    "descricao": "Retornar sobre proposta enviada",
    "funilNome": "Comercial"
  }'

# 5. Criar nota administrativa (privada)
curl -X POST ${projectUrl}/functions/v1/cards-api \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sua_api_key" \\
  -d '{
    "action": "createActivity",
    "conversationId": 4406,
    "descricao": "Cliente solicitou suporte técnico",
    "funilNome": "Suporte"
  }'`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <Code2 className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Documentação da API</h2>
          <p className="text-sm text-muted-foreground">Integre sistemas externos e agentes IA</p>
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
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary">API Key gerada!</span>
              </div>
              <div className="flex gap-2">
                <Input value={apiKey} readOnly className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={() => copyToClipboard(apiKey, "API Key")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-destructive">⚠️ Guarde esta chave! Ela não será exibida novamente.</p>
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

      {/* Tabs para Endpoints */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Endpoints Básicos
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Agentes IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          {/* Endpoints Básicos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Endpoints Básicos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {basicEndpoints.map((ep, i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[10px]">
                      {ep.method}
                    </Badge>
                    <code className="text-xs">{ep.path}</code>
                  </div>
                  <p className="text-xs text-muted-foreground">{ep.description}</p>
                  <pre className="text-[10px] bg-background p-2 rounded overflow-x-auto">
                    {JSON.stringify(ep.body, null, 2)}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* N8n Example */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Exemplo N8n / Make
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
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          {/* Endpoints para Agentes IA */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                Endpoints para Agentes IA
              </CardTitle>
              <CardDescription className="text-xs">
                Endpoints otimizados para automação via Chatwoot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiEndpoints.map((ep, i) => (
                <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[10px]">
                      {ep.method}
                    </Badge>
                    <code className="text-xs font-semibold">{ep.path}</code>
                  </div>
                  <p className="text-xs text-muted-foreground">{ep.description}</p>
                  <div className="grid gap-2">
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground">Request:</span>
                      <pre className="text-[10px] bg-background p-2 rounded overflow-x-auto">
                        {JSON.stringify(ep.body, null, 2)}
                      </pre>
                    </div>
                    {ep.response && (
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground">Response:</span>
                        <pre className="text-[10px] bg-background p-2 rounded overflow-x-auto">
                          {JSON.stringify(ep.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Fluxo do Agente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Fluxo Recomendado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="text-[10px] bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap">{aiFlowExample}</pre>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="absolute top-1 right-1 h-7"
                  onClick={() => copyToClipboard(aiFlowExample, "Fluxo")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Exemplos Curl */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                Exemplos cURL
              </CardTitle>
              <CardDescription className="text-xs">
                Copie e cole no terminal ou no seu agente IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="text-[10px] bg-muted p-3 rounded overflow-x-auto whitespace-pre-wrap max-h-[400px]">{curlExamples}</pre>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="absolute top-1 right-1 h-7"
                  onClick={() => copyToClipboard(curlExamples, "Exemplos cURL")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
