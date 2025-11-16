import { useState } from "react";
import { useMessageTemplates } from "@/hooks/useMessageTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Plus, Trash2, Edit } from "lucide-react";

export const MessageTemplatesManager = () => {
  const { templates, createTemplate, deleteTemplate, updateTemplate, isCreating } = useMessageTemplates();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    conteudo: "",
    atalho: "",
  });

  const handleSubmit = () => {
    if (editingId) {
      updateTemplate({ id: editingId, ...form });
    } else {
      createTemplate({ ...form, ativo: true });
    }
    resetForm();
  };

  const resetForm = () => {
    setForm({ titulo: "", conteudo: "", atalho: "" });
    setEditingId(null);
    setOpen(false);
  };

  const handleEdit = (template: any) => {
    setForm({
      titulo: template.titulo,
      conteudo: template.conteudo,
      atalho: template.atalho || "",
    });
    setEditingId(template.id);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Templates de Mensagens</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditingId(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Novo"} Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título</label>
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Saudação inicial"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Atalho (opcional)</label>
                <Input
                  value={form.atalho}
                  onChange={(e) => setForm({ ...form, atalho: e.target.value })}
                  placeholder="Ex: /oi"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Conteúdo</label>
                <Textarea
                  value={form.conteudo}
                  onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                  placeholder="Olá! Como posso ajudar?"
                  rows={4}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isCreating}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {template.titulo}
                  {template.atalho && (
                    <code className="px-2 py-1 bg-muted rounded text-xs">
                      {template.atalho}
                    </code>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{template.conteudo}</p>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum template cadastrado. Crie seu primeiro template para ganhar produtividade!
          </p>
        )}
      </div>
    </div>
  );
};
