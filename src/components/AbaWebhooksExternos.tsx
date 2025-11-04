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
import { Copy, Trash2, Edit, Plus, ExternalLink } from "lucide-react";
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
                  <TableHead>Caminho</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.name}</TableCell>
                    <TableCell className="font-mono text-sm">{config.inbox_path}</TableCell>
                    <TableCell>{config.events.join(', ')}</TableCell>
                    <TableCell>
                      <span className={config.active ? "text-green-600" : "text-gray-400"}>
                        {config.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyUrl(config.inbox_path)}
                          title="Copiar URL do Webhook"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(generateWebhookUrl(config.inbox_path), '_blank')}
                          title="Abrir URL"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Deletar webhook "${config.name}"?`)) {
                              deleteConfig(config.id);
                            }
                          }}
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

      <Card>
        <CardHeader>
          <CardTitle>Como Configurar no Chatwoot</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <ol className="space-y-2">
            <li>Acesse <strong>Settings &gt; Integrations &gt; Webhooks</strong> no Chatwoot</li>
            <li>Clique em <strong>Add Webhook</strong></li>
            <li>Cole a URL copiada do webhook desejado (botão <Copy className="inline h-3 w-3" />)</li>
            <li>Selecione os eventos correspondentes (conversation_updated, message_created)</li>
            <li>Ative o webhook e salve</li>
          </ol>
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
                <Label htmlFor="inbox_path">Caminho do Inbox *</Label>
                <Input
                  id="inbox_path"
                  placeholder="Ex: /Meu%20Comercial ou /Meu Comercial"
                  value={formData.inbox_path}
                  onChange={(e) => setFormData({ ...formData, inbox_path: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Deve começar com / e ser único. URL gerada: {generateWebhookUrl(formData.inbox_path || '/exemplo')}
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
