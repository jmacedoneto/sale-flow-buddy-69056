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

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Correlação Inteligente Labels/Attrs</AlertTitle>
        <AlertDescription>
          Configure matches exatos para evitar confusão automática. Edge prioriza: 
          <strong> Exact Match → ILIKE Similarity → Auto-Create ({">"} 3 chars) → Default</strong>.
          Mappings ativos são usados instantaneamente pelos webhooks.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Mappings Chatwoot → Funil/Etapa</CardTitle>
          <CardDescription>
            Adicione correlações exatas entre labels/attributes do Chatwoot e funis/etapas do CRM.
            Use para labels como "comercial" → Funil "Comercial", ou attrs como "nome_do_funil=Evento Colisão".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Mapping
            </Button>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : mappings.length === 0 ? (
            <p className="text-muted-foreground">Nenhum mapping configurado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Chave Chatwoot</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Funil Lovable</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      <span className={mapping.chatwoot_type === 'label' ? 'text-blue-600' : 'text-purple-600'}>
                        {mapping.chatwoot_type}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{mapping.chatwoot_key}</TableCell>
                    <TableCell className="font-mono text-sm">{mapping.chatwoot_value || '-'}</TableCell>
                    <TableCell>{mapping.lovable_funil || '-'}</TableCell>
                    <TableCell>{mapping.lovable_etapa || '-'}</TableCell>
                    <TableCell>{mapping.ordem}</TableCell>
                    <TableCell>
                      <span className={mapping.active ? "text-green-600" : "text-gray-400"}>
                        {mapping.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                            if (confirm(`Deletar mapping "${mapping.chatwoot_key}"?`)) {
                              deleteMapping(mapping.id);
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
          <CardTitle>Como Funciona</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <ul className="space-y-2">
            <li><strong>Labels:</strong> Ex: "comercial" → Funil "Comercial", "etapa:negociacao" (split :) → Etapa "Negociação"</li>
            <li><strong>Attrs:</strong> Ex: "nome_do_funil" + valor "Evento Colisão" → Funil "Evento Colisão"</li>
            <li><strong>Ordem:</strong> 1 = alta prioridade (verificado primeiro), maior número = menor prioridade</li>
            <li><strong>Valor null:</strong> Match qualquer valor para aquela chave (ex: label "comercial" sem valor específico)</li>
            <li><strong>Fallback:</strong> Se não houver match exato, edge tenta ILIKE similarity → auto-create → default "Padrão"</li>
          </ul>
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
                {editingId ? 'Editar Mapping' : 'Adicionar Mapping'}
              </DialogTitle>
              <DialogDescription>
                Configure a correlação entre label/attr do Chatwoot e funil/etapa do CRM.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={formData.chatwoot_type}
                  onValueChange={(val: 'label' | 'attr') => 
                    setFormData({ ...formData, chatwoot_type: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="label">Label</SelectItem>
                    <SelectItem value="attr">Attribute</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Label: de conversation.labels[]; Attr: de conversation.custom_attributes
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="key">Chave Chatwoot *</Label>
                <Input
                  id="key"
                  placeholder={formData.chatwoot_type === 'label' ? 'Ex: comercial, etapa_negociacao' : 'Ex: nome_do_funil, funil_etapa'}
                  value={formData.chatwoot_key}
                  onChange={(e) => setFormData({ ...formData, chatwoot_key: e.target.value })}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  {formData.chatwoot_type === 'label' 
                    ? 'Será feito split por ":" (ex: "etapa:negociacao" → key="negociacao")'
                    : 'Nome exato do custom attribute'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Valor Específico (Opcional)</Label>
                <Input
                  id="value"
                  placeholder="Ex: Comercial, Em Fechamento (deixe vazio para match any)"
                  value={formData.chatwoot_value}
                  onChange={(e) => setFormData({ ...formData, chatwoot_value: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Se preenchido, faz match exato chave+valor. Vazio = match qualquer valor.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="funil">Funil Lovable</Label>
                <Select
                  value={formData.lovable_funil}
                  onValueChange={(val) => setFormData({ ...formData, lovable_funil: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um funil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {funis.map((funil) => (
                      <SelectItem key={funil} value={funil}>
                        {funil}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="etapa">Etapa</Label>
                <Select
                  value={formData.lovable_etapa}
                  onValueChange={(val) => setFormData({ ...formData, lovable_etapa: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {etapas.map((etapa) => (
                      <SelectItem key={etapa} value={etapa}>
                        {etapa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ordem">Ordem de Prioridade</Label>
                <Input
                  id="ordem"
                  type="number"
                  min="0"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                />
                <p className="text-sm text-muted-foreground">
                  1 = alta prioridade (verificado primeiro), valores maiores = menor prioridade
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active" className="cursor-pointer">
                  Mapping Ativo
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
