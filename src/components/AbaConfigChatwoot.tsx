import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertCircle, Eye, EyeOff, TestTube2, Loader2, Webhook, ExternalLink } from "lucide-react";
import { useChatwootSync } from "@/hooks/useChatwootSync";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const AbaConfigChatwoot = () => {
  const { syncOptions, isSyncing } = useChatwootSync();
  
  const [formData, setFormData] = useState({
    url: "",
    account_id: "",
    api_key: "",
  });

  const [config, setConfig] = useState<any>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingCycle, setIsTestingCycle] = useState(false);
  const [status, setStatus] = useState<'connected' | 'invalid' | 'network_error' | 'no_key' | null>(null);

  // Carregar configuração existente
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase
        .from('integracao_chatwoot')
        .select('*')
        .limit(1)
        .single();
      
      if (data) {
        setConfig(data);
        setFormData({
          url: data.url || "",
          account_id: data.account_id?.toString() || "",
          api_key: data.api_key || "",
        });
        
        // Auto-test se tem api_key salva
        if (data.api_key && data.url && data.account_id) {
          autoTest(data.url, data.account_id.toString(), data.api_key);
        }
      }
    };
    loadConfig();
  }, []);

  const autoTest = async (url?: string, account_id?: string, api_key?: string) => {
    const testUrl = url || formData.url;
    const testAccountId = account_id || formData.account_id;
    const testApiKey = api_key || formData.api_key;

    if (!testApiKey || !testUrl || !testAccountId) {
      setStatus('no_key');
      return;
    }

    try {
      const { testChatwootConnection } = await import("@/services/chatwootConfigService");
      const result = await testChatwootConnection(testUrl, parseInt(testAccountId), testApiKey);
      
      if (result.ok) {
        setStatus('connected');
        console.log('[AbaConfigChatwoot] Auto-test OK:', result.message);
      } else {
        setStatus(result.status === 'auth_error' ? 'invalid' : 'network_error');
        console.log('[AbaConfigChatwoot] Auto-test falhou:', result.status, result.message);
      }
    } catch (err: any) {
      setStatus('network_error');
      console.error('[AbaConfigChatwoot] Erro no auto-test:', err);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      if (!formData.api_key || !formData.url || !formData.account_id) {
        setStatus('no_key');
        toast.error("❌ Preencha todos os campos");
        return;
      }

      const { testChatwootConnection } = await import("@/services/chatwootConfigService");
      const result = await testChatwootConnection(
        formData.url,
        parseInt(formData.account_id),
        formData.api_key
      );

      if (result.ok) {
        setStatus('connected');
        toast.success("✓ Conexão com Chatwoot OK", {
          description: result.message,
        });
      } else {
        // Mapear status da edge para status da UI
        if (result.status === 'auth_error') {
          setStatus('invalid');
        } else if (result.status === 'network_error') {
          setStatus('network_error');
        } else {
          setStatus('invalid');
        }
        
        toast.error("❌ Falha ao conectar", {
          description: result.message,
        });
      }
    } catch (err: any) {
      setStatus('network_error');
      toast.error("❌ Erro ao testar conexão", {
        description: err.message || "Erro desconhecido ao chamar edge function",
      });
      console.error('[AbaConfigChatwoot] Erro ao testar:', err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    console.log('[FE Debug] Starting save, form:', formData);
    
    try {
      const cleanUrl = formData.url.endsWith('/') ? formData.url.slice(0, -1) : formData.url;
      
      const payload = {
        url: cleanUrl,
        account_id: parseInt(formData.account_id),
        api_key: formData.api_key?.trim(),
        label: "KANBAN_CRM",
        bidir_enabled: true,
      };
      
      console.log('[FE Debug] Payload to DB:', payload);

      // Buscar config existente
      const { data: existing, error: fetchError } = await supabase
        .from('integracao_chatwoot')
        .select('id')
        .limit(1)
        .single();

      console.log('[FE Debug] Existing config:', existing, 'Error:', fetchError);

      if (!existing || fetchError) {
        // Insert primeira vez
        const { data: insertData, error: insertErr } = await supabase
          .from('integracao_chatwoot')
          .insert(payload)
          .select()
          .single();

        if (insertErr) {
          console.error('[FE Debug] Insert error:', insertErr);
          throw insertErr;
        }
        
        console.log('[FE Debug] Insert success:', insertData);
        toast.success("✓ Configuração inserida", {
          description: "Configuração do Chatwoot criada com sucesso.",
        });
        setConfig(insertData);
      } else {
        // Upsert com ID existente
        const upsertPayload = { ...payload, id: existing.id };
        console.log('[FE Debug] Upsert payload with ID:', upsertPayload);

        const { data: updateData, error: updateErr } = await supabase
          .from('integracao_chatwoot')
          .upsert(upsertPayload, { onConflict: 'id' })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateErr) {
          console.error('[FE Debug] Upsert error:', updateErr);
          throw updateErr;
        }
        
        console.log('[FE Debug] Upsert success:', updateData);
        toast.success("✓ Configuração atualizada", {
          description: "Configuração do Chatwoot salva com sucesso.",
        });
        setConfig(updateData);
      }

      // Verificação post-save
      const { data: verify, error: verifyErr } = await supabase
        .from('integracao_chatwoot')
        .select('*')
        .limit(1)
        .single();
      
      console.log('[FE Debug] DB Verify:', verify, 'Error:', verifyErr);
      
      if (!verify) throw new Error('Nenhuma configuração encontrada após save');

      // Auto-test após save (apenas se tiver dados válidos)
      if (verify.api_key && verify.url && verify.account_id) {
        autoTest(verify.url, verify.account_id.toString(), verify.api_key);
      }
      
    } catch (error: any) {
      console.error('[FE Debug] Save error completo:', error);
      toast.error(`❌ Erro ao salvar configuração`, {
        description: `${error.message} (Código: ${error.code || 'N/A'})`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestFullCycle = async () => {
    setIsTestingCycle(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-bidir-full');
      
      if (error) throw error;

      if (data.success) {
        toast.success("✓ Teste do ciclo completo concluído!", {
          description: "Sistema funcionando corretamente. Verifique os logs para detalhes.",
        });
        console.log('[Test Full Cycle]', data.log);
      } else {
        toast.error("❌ Teste falhou", {
          description: data.error || "Verifique os logs para mais informações",
        });
        console.error('[Test Full Cycle]', data.log || data.error);
      }
    } catch (error) {
      console.error('Erro ao testar ciclo:', error);
      toast.error("❌ Erro ao executar teste", {
        description: String(error),
      });
    } finally {
      setIsTestingCycle(false);
    }
  };

  const isFormValid = formData.url && formData.account_id && formData.api_key;

  const projectId = "tlbnjicthmljpcnwjuup";
  const webhooks = [
    {
      name: "Meu Comercial",
      path: "Meu%20Comercial",
      funil: "Comercial",
      description: "Webhook para funil Comercial (sync: nome_do_funil, etapa_comercial, funil_etapa, data_retorno)",
      proxyUrl: "https://evolution.apvsiguatemi.net/chatwoot/webhook/Meu%20Comercial",
    },
    {
      name: "Atendimento Regional",
      path: "Atendimento%20Regional",
      funil: "Admin Regional",
      description: "Webhook para funil Admin Regional (sync: nome_do_funil, funil_etapa, data_retorno)",
      proxyUrl: "https://evolution.apvsiguatemi.net/chatwoot/webhook/Atendimento%20Regional",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            CHATWOOT - Status: {status === null ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : status === 'connected' ? (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                Conectado ✅
              </Badge>
            ) : status === 'invalid' ? (
              <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">
                Inválido ❌
              </Badge>
            ) : status === 'network_error' ? (
              <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
                Erro Rede ⚠️
              </Badge>
            ) : (
              <span className="text-muted-foreground text-sm">⚪ Não Configurado</span>
            )}
          </CardTitle>
          <CardDescription>
            Configure as credenciais de integração com o Chatwoot
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-4">
        {/* URL Chatwoot */}
        <div className="space-y-2">
          <Label htmlFor="url">◾ URL Chatwoot</Label>
          <Input
            id="url"
            type="url"
            placeholder="https://app.chatwoot.com"
            value={formData.url}
            onChange={(e) => handleChange('url', e.target.value)}
          />
          <p className="text-sm text-muted-foreground">(sem barra "/" final)</p>
        </div>

        {/* Account ID */}
        <div className="space-y-2">
          <Label htmlFor="account_id">◾ Account ID</Label>
          <Input
            id="account_id"
            type="number"
            placeholder="123456"
            value={formData.account_id}
            onChange={(e) => handleChange('account_id', e.target.value)}
          />
          <p className="text-sm text-muted-foreground">(número inteiro)</p>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <Label htmlFor="api_key">◾ API Key</Label>
          <div className="relative">
            <Input
              id="api_key"
              type={showApiKey ? "text" : "password"}
              placeholder="sua_api_key_aqui"
              value={formData.api_key}
              onChange={(e) => handleChange('api_key', e.target.value)}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Token de acesso da API do Chatwoot
          </p>
        </div>

        {/* Informação sobre Sync Automático Bidirecional */}
        <Alert className="bg-primary/5 border-primary/20">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm text-muted-foreground">
            <strong className="text-foreground">Sincronização Bidirecional Ativa:</strong> Alterações no Chatwoot atualizam automaticamente os cards. Custom attributes sincronizados: nome_do_funil, funil_etapa, data_retorno.
          </AlertDescription>
        </Alert>

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-4 flex-wrap">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!isFormValid || isTesting}
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              '🧪 Testar Conexão'
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isFormValid || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              '💾 Salvar'
            )}
          </Button>
          {config && (
            <>
              <Button
                variant="secondary"
                onClick={() => syncOptions()}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Sincronizar com Chatwoot
              </Button>
              <Button
                variant="outline"
                onClick={handleTestFullCycle}
                disabled={isTestingCycle}
              >
                {isTestingCycle ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <TestTube2 className="h-4 w-4 mr-2" />
                    Testar Ciclo Bidirecional
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Webhooks Configurados
        </CardTitle>
        <CardDescription>
          URLs de webhook específicas para cada inbox do Chatwoot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {webhooks.map((webhook) => (
          <Alert key={webhook.path}>
            <AlertDescription className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-semibold flex items-center gap-2">
                    {webhook.name}
                    <span className="text-xs font-normal text-muted-foreground">
                      → Funil: {webhook.funil}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{webhook.description}</p>
                </div>
              </div>
              
              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">URL Proxy (Chatwoot):</span>
                  <a
                    href={webhook.proxyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {webhook.proxyUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">URL Direct (Supabase):</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    https://{projectId}.supabase.co/functions/v1/dispatcher-multi/{webhook.path}
                  </code>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        ))}
        
        <Alert>
          <AlertDescription className="text-sm">
            <strong>Instruções:</strong> Em Chatwoot → Settings → Integrations → Webhooks:
            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
              <li>Adicione/Edite webhook para cada inbox acima</li>
              <li>Use as URLs proxy listadas acima</li>
              <li>Events: <code className="bg-muted px-1 rounded">conversation_updated</code>, <code className="bg-muted px-1 rounded">message_created</code></li>
              <li>Active: Yes</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
    </div>
  );
};
