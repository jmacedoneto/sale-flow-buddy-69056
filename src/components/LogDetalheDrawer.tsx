import { useQuery } from "@tanstack/react-query";
import { getWebhookLogById } from "@/services/webhookLogsService";
import { useChatwootConfig } from "@/hooks/useChatwootConfig";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileText,
  Clock,
  ArrowRight,
  ArrowLeft,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
interface LogDetalheDrawerProps {
  logId: string | null;
  open: boolean;
  onClose: () => void;
}

export const LogDetalheDrawer = ({ logId, open, onClose }: LogDetalheDrawerProps) => {
  const navigate = useNavigate();
  const { config } = useChatwootConfig();
  
  const { data: log, isLoading } = useQuery({
    queryKey: ['webhook-log', logId],
    queryFn: () => getWebhookLogById(logId!),
    enabled: !!logId && open,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Erro</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Aviso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSyncTypeLabel = (syncType: string) => {
    return syncType === 'chatwoot_to_lovable' 
      ? { label: 'Chatwoot → Lovable', icon: <ArrowRight className="h-4 w-4" /> }
      : { label: 'Lovable → Chatwoot', icon: <ArrowLeft className="h-4 w-4" /> };
  };

  const extractBusinessData = (payload: any) => {
    if (!payload) return null;
    return {
      funil_nome: payload.funil_nome || payload.final_funil_nome,
      funil_etapa: payload.funil_etapa || payload.final_etapa_nome,
      etapa_comercial: payload.etapa_comercial,
      data_retorno: payload.data_retorno,
      nome_do_funil: payload.custom_attributes?.nome_do_funil,
      titulo: payload.titulo,
    };
  };

  const formatLatency = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const openInChatwoot = () => {
    if (!log?.conversation_id || !config?.account_id || !config?.url) return;
    const url = `${config.url}/app/accounts/${config.account_id}/conversations/${log.conversation_id}`;
    window.open(url, '_blank');
  };

  const openCard = () => {
    if (!log?.card_id) return;
    console.log('[Navigation] Abrindo card via LogDetalheDrawer:', log.card_id, 'log:', log.id);
    navigate(`/dashboard?cardId=${log.card_id}`);
    onClose();
  };

  if (!log && !isLoading) return null;

  const businessData = log ? extractBusinessData(log.payload) : null;
  const syncTypeData = log ? getSyncTypeLabel(log.sync_type) : null;

  return (
    <Drawer open={open} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Log de Webhook
          </DrawerTitle>
          <DrawerDescription>
            {log && format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="h-[calc(90vh-120px)] px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Carregando detalhes...</div>
            </div>
          ) : log ? (
            <div className="space-y-6 pb-6">
              {/* Informações Básicas */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(log.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo de Sync</label>
                  <div className="mt-1 flex items-center gap-2">
                    {syncTypeData?.icon}
                    <span className="text-sm">{syncTypeData?.label}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Evento</label>
                  <div className="mt-1 text-sm">{log.event_type || '-'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Latência</label>
                  <div className="mt-1 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatLatency(log.latency_ms)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Conversa ID</label>
                  <div className="mt-1 text-sm font-mono">{log.conversation_id || '-'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Card ID</label>
                  <div className="mt-1 text-sm font-mono truncate">{log.card_id || '-'}</div>
                </div>
              </div>

              {log.error_message && (
                <div>
                  <label className="text-sm font-medium text-destructive">Mensagem de Erro</label>
                  <div className="mt-1 p-3 bg-destructive/10 rounded-md text-sm text-destructive">
                    {log.error_message}
                  </div>
                </div>
              )}

              {/* Resumo de Negócio */}
              {businessData && Object.values(businessData).some(v => v) && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Resumo de Negócio</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {businessData.funil_nome && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Funil</label>
                          <div className="mt-1 text-sm">{businessData.funil_nome}</div>
                        </div>
                      )}
                      {businessData.funil_etapa && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Etapa</label>
                          <div className="mt-1 text-sm">{businessData.funil_etapa}</div>
                        </div>
                      )}
                      {businessData.etapa_comercial && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Etapa Comercial</label>
                          <div className="mt-1 text-sm">{businessData.etapa_comercial}</div>
                        </div>
                      )}
                      {businessData.data_retorno && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Data de Retorno</label>
                          <div className="mt-1 text-sm">{businessData.data_retorno}</div>
                        </div>
                      )}
                      {businessData.titulo && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-muted-foreground">Título</label>
                          <div className="mt-1 text-sm">{businessData.titulo}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Payload JSON */}
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Payload Completo (JSON)</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2) || 'null');
                      toast.success("JSON copiado!");
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
                  </Button>
                </div>
                <div className="relative">
                  <pre className="p-4 bg-muted rounded-md text-xs overflow-x-auto max-h-[300px]">
                    <code>{JSON.stringify(log.payload, null, 2) || 'null'}</code>
                  </pre>
                </div>
              </div>

              {/* Links Rápidos */}
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Links Rápidos</h3>
                <div className="flex gap-2 flex-wrap">
                  {log.conversation_id && config?.url && config?.account_id && (
                    <Button onClick={openInChatwoot} variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir no Chatwoot
                    </Button>
                  )}
                  {log.card_id && (
                    <Button onClick={openCard} variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Abrir Card no CRM
                    </Button>
                  )}
                  {!log.conversation_id && !log.card_id && (
                    <div className="text-sm text-muted-foreground">Nenhum link disponível</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
};
