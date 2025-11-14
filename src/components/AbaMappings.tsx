import { useState } from "react";
import { useMappings } from "@/hooks/useMappings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit, Plus, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const AbaMappings = () => {
  const { mappings, funis, etapas, isLoading, createMapping, updateMapping, deleteMapping } = useMappings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    chatwoot_type: 'label' as 'label' | 'attr',
    chatwoot_key: '',
    chatwoot_value: '',
    lovable_funil: '',
    lovable_etapa: '',
    ordem: 0,
    active: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.chatwoot_key) {
      toast({
        title: "❌ Campo obrigatório",
        description: "Chave do Chatwoot é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.lovable_funil && !formData.lovable_etapa) {
      toast({
        title: "❌ Campo obrigatório",
        description: "Selecione pelo menos um Funil ou Etapa.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      chatwoot_type: formData.chatwoot_type,
      chatwoot_key: formData.chatwoot_key,
      chatwoot_value: formData.chatwoot_value || null,
      lovable_funil: formData.lovable_funil || null,
      lovable_etapa: formData.lovable_etapa || null,
      ordem: formData.ordem,
      active: formData.active,
    };

    if (editingId) {
      updateMapping({ id: editingId, updates: payload });
    } else {
      createMapping(payload);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      chatwoot_type: 'label',
      chatwoot_key: '',
      chatwoot_value: '',
      lovable_funil: '',
      lovable_etapa: '',
      ordem: 0,
      active: true,
    });
    setEditingId(null);
  };

  const handleEdit = (mapping: any) => {
    setFormData({
      chatwoot_type: mapping.chatwoot_type,
      chatwoot_key: mapping.chatwoot_key,
      chatwoot_value: mapping.chatwoot_value || '',
      lovable_funil: mapping.lovable_funil || '',
      lovable_etapa: mapping.lovable_etapa || '',
      ordem: mapping.ordem,
      active: mapping.active,
    });
    setEditingId(mapping.id);
    setIsDialogOpen(true);
  };

  const activeMappings = mappings.filter(m => m.active);
  const inactiveMappings = mappings.filter(m => !m.active);

  return (
    <div className="space-y-6">
      <Alert className="border-primary/20 bg-primary/5">
        <AlertCircle className="h-4 w-4 text-primary" />
        <AlertTitle>⚠️ IMPORTANTE: Labels Definem Funil</AlertTitle>
        <AlertDescription className="space-y-2">
          <p className="font-medium">
            A partir de agora, <strong>APENAS LABELS</strong> definem o funil de destino do card.
          </p>
          <p className="text-sm">
            Prioridade: <strong>Labels → Path da Inbox → Default "Padrão"</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Atributo "nome_do_funil" está depreciado e foi desativado. Use as labels configuradas abaixo.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mappings Ativos (Labels → Funil/Etapa)</CardTitle>
              <CardDescription>
                Correlações ativas usadas pelo dispatcher-multi para converter eventos do Chatwoot em cards
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Correlação
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : activeMappings.length === 0 ? (
            <p className="text-muted-foreground">Nenhum mapping ativo configurado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Chave Chatwoot</TableHead>
                  <TableHead>Valor (se attr)</TableHead>
                  <TableHead>→ Funil Lovable</TableHead>
                  <TableHead>→ Etapa Lovable</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeMappings.map((mapping) => (
                  <TableRow key={mapping.id} className={mapping.chatwoot_type === 'label' ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        mapping.chatwoot_type === 'label' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground line-through'
                      }`}>
                        {mapping.chatwoot_type === 'label' ? 'Label' : 'Attr (deprecated)'}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{mapping.chatwoot_key}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {mapping.chatwoot_value || '—'}
                    </TableCell>
                    <TableCell className="font-medium">{mapping.lovable_funil || '—'}</TableCell>
                    <TableCell className="font-medium">{mapping.lovable_etapa || '—'}</TableCell>
                    <TableCell>{mapping.ordem}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(mapping)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Deletar este mapping?')) {
                            deleteMapping(mapping.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {inactiveMappings.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm text-muted-foreground font-medium">
                📦 Mappings Inativos/Depreciados ({inactiveMappings.length})
              </summary>
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                {inactiveMappings.map(m => (
                  <div key={m.id} className="opacity-50">
                    {m.chatwoot_type} | {m.chatwoot_key} → {m.lovable_funil || m.lovable_etapa}
                  </div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Mapping' : 'Novo Mapping'}</DialogTitle>
            <DialogDescription>
              Configure a correlação entre Chatwoot (label/attr) e Lovable (funil/etapa).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select
                value={formData.chatwoot_type}
                onValueChange={(val) => setFormData({ ...formData, chatwoot_type: val as 'label' | 'attr' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="label">Label (recomendado)</SelectItem>
                  <SelectItem value="attr">Attr (depreciado)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Chave Chatwoot *</Label>
              <Input
                value={formData.chatwoot_key}
                onChange={(e) => setFormData({ ...formData, chatwoot_key: e.target.value })}
                placeholder="Ex: comercial, funil_etapa"
              />
            </div>

            {formData.chatwoot_type === 'attr' && (
              <div>
                <Label>Valor do Atributo</Label>
                <Input
                  value={formData.chatwoot_value}
                  onChange={(e) => setFormData({ ...formData, chatwoot_value: e.target.value })}
                  placeholder="Ex: Comercial, Admin Regional"
                />
              </div>
            )}

            <div>
              <Label>Funil Lovable</Label>
              <Select
                value={formData.lovable_funil}
                onValueChange={(val) => setFormData({ ...formData, lovable_funil: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funil (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {funis.filter(f => f && f.trim() !== '').map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Etapa Lovable</Label>
              <Select
                value={formData.lovable_etapa}
                onValueChange={(val) => setFormData({ ...formData, lovable_etapa: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma etapa (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {etapas.filter(e => e && e.trim() !== '').map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Ordem</Label>
              <Input
                type="number"
                value={formData.ordem}
                onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label>Ativo</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
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
