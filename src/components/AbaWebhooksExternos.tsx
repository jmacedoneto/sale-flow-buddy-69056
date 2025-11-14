import { useState } from "react";
import { useWebhookConfig } from "@/hooks/useWebhookConfig";
import { generateWebhookUrl } from "@/services/webhookConfigService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Trash2, Edit, Plus, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AVAILABLE_EVENTS = [
  { id: 'conversation_updated', label: 'Conversa Atualizada' },
  { id: 'message_created', label: 'Mensagem Criada' },
  { id: 'conversation_created', label: 'Conversa Criada' },
];

export const AbaWebhooksExternos = () => {
  const { configs, isLoading, createConfig, updateConfig, deleteConfig } = useWebhookConfig();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    inbox_path: '',
    events: ['conversation_updated', 'message_created'] as string[],
    active: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.inbox_path) {
      toast({
        title: "❌ Campos obrigatórios",
        description: "Nome e Caminho são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (editingId) {
      updateConfig({ id: editingId, updates: formData });
    } else {
      createConfig(formData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      inbox_path: '',
      events: ['conversation_updated', 'message_created'],
      active: true,
    });
    setEditingId(null);
  };

  const handleEdit = (config: any) => {
    setFormData({
      name: config.name,
      url: config.url || '',
      inbox_path: config.inbox_path,
      events: config.events,
      active: config.active,
    });
    setEditingId(config.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este webhook?')) {
      deleteConfig(id);
    }
  };

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'sjrmpojssvfgquroywys';

  const handleCopyUrl = (inboxPath: string) => {
    const url = generateWebhookUrl(inboxPath);
    navigator.clipboard.writeText(url);
    toast({
      title: "✓ URL copiada",
      description: "URL do webhook copiada para área de transferência.",
    });
  };

  const toggleEvent = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Webhooks Externos do Chatwoot</CardTitle>
          <CardDescription>
            Configure as URLs dos webhooks do Chatwoot que serão sincronizados com o CRM.
            Cada inbox pode ter sua própria URL e eventos.
          </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Webhook
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : configs.length === 0 ? (
          <p className="text-muted-foreground">Nenhum webhook configurado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>URL / Caminho</TableHead>
                <TableHead>Eventos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{config.name}</TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">Path:</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {config.inbox_path}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">URL Direta:</span>
                        <code className="text-xs bg-primary/10 px-2 py-1 rounded max-w-md truncate" title={`https://${projectId}.supabase.co/functions/v1/dispatcher-multi/${config.inbox_path}`}>
                          https://{projectId}.supabase.co/functions/v1/dispatcher-multi/{config.inbox_path}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyUrl(config.inbox_path)}
                          title="Copiar URL Direta"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {config.events?.join(', ') || 'Nenhum'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.active ? "default" : "secondary"}>
                      {config.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {config.url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          title="Abrir URL externa"
                        >
                          <a href={config.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(config.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Webhook' : 'Adicionar Webhook'}
              </DialogTitle>
              <DialogDescription>
                Configure as informações do webhook do Chatwoot.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Meu Comercial"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inbox_path">Inbox Path *</Label>
                <Input
                  id="inbox_path"
                  value={formData.inbox_path}
                  onChange={(e) => {
                    let value = e.target.value;
                    // Remove leading slash
                    if (value.startsWith('/')) {
                      value = value.substring(1);
                    }
                    // Remove http/https
                    if (value.startsWith('http://') || value.startsWith('https://')) {
                      toast({
                        title: "❌ Formato inválido",
                        description: "Use apenas o path, não a URL completa",
                        variant: "destructive",
                      });
                      return;
                    }
                    // Replace spaces with underscore
                    value = value.replace(/\s+/g, '_');
                    setFormData({ ...formData, inbox_path: value });
                  }}
                  placeholder="ex: comercial_geral"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Identificador único (sem barra, sem URL). Preview: <code className="text-xs bg-muted px-1 rounded">https://{projectId}.supabase.co/functions/v1/dispatcher-multi/{formData.inbox_path || 'seu_path'}</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL Externa (Opcional)</Label>
                <Input
                  id="url"
                  placeholder="Ex: https://evolution.apvsiguatemi.net/chatwoot/webhook/..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Se usar proxy, insira a URL externa aqui. Caso contrário, deixe em branco.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Eventos do Webhook</Label>
                <div className="space-y-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <div key={event.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={event.id}
                        checked={formData.events.includes(event.id)}
                        onCheckedChange={() => toggleEvent(event.id)}
                      />
                      <Label htmlFor={event.id} className="font-normal cursor-pointer">
                        {event.label} ({event.id})
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Webhook Ativo
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingId ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
