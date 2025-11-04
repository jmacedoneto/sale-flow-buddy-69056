import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWebhooks } from "@/hooks/useWebhooks";

const EVENTOS_CHATWOOT = [
  { value: 'conversation_created', label: 'conversation_created' },
  { value: 'conversation_updated', label: 'conversation_updated' },
  { value: 'message_created', label: 'message_created' },
  { value: 'conversation_reopened', label: 'conversation_reopened' },
  { value: 'agent_assigned', label: 'agent_assigned' },
  { value: 'label_added', label: 'label_added' },
  { value: 'label_removed', label: 'label_removed' },
];

const ACOES_DISPONIVEIS = [
  { value: 'criar_card', label: 'Criar card no CRM' },
  { value: 'atualizar_card', label: 'Atualizar card existente' },
  { value: 'adicionar_nota', label: 'Adicionar nota (CRM)' },
  { value: 'mudar_etapa', label: 'Mudar etapa do card' },
  { value: 'notificar', label: 'Enviar notificação' },
];

export const FormNovoWebhook = () => {
  const { createWebhook, isCreating } = useWebhooks();
  
  const [formData, setFormData] = useState({
    nome: "",
    evento_chatwoot: "",
    acao: "",
    ativo: true,
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    createWebhook(formData);
    // Limpar formulário após criar
    setFormData({
      nome: "",
      evento_chatwoot: "",
      acao: "",
      ativo: true,
    });
  };

  const handleCancel = () => {
    setFormData({
      nome: "",
      evento_chatwoot: "",
      acao: "",
      ativo: true,
    });
  };

  const isFormValid = formData.nome && formData.evento_chatwoot && formData.acao;

  return (
    <Card>
      <CardHeader>
        <CardTitle>➕ Novo Webhook</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nome do Webhook */}
        <div className="space-y-2">
          <Label htmlFor="nome">◾ Nome do Webhook:</Label>
          <Input
            id="nome"
            placeholder="Ex: Criar Card no CRM"
            value={formData.nome}
            onChange={(e) => handleChange('nome', e.target.value)}
          />
        </div>

        {/* Evento Chatwoot */}
        <div className="space-y-2">
          <Label htmlFor="evento">◾ Evento Chatwoot:</Label>
          <Select value={formData.evento_chatwoot} onValueChange={(v) => handleChange('evento_chatwoot', v)}>
            <SelectTrigger id="evento">
              <SelectValue placeholder="Selecionar evento..." />
            </SelectTrigger>
            <SelectContent>
              {EVENTOS_CHATWOOT.map(evt => (
                <SelectItem key={evt.value} value={evt.value}>
                  {evt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ação ao Disparar */}
        <div className="space-y-2">
          <Label htmlFor="acao">◾ Ação ao Disparar:</Label>
          <Select value={formData.acao} onValueChange={(v) => handleChange('acao', v)}>
            <SelectTrigger id="acao">
              <SelectValue placeholder="Selecionar ação..." />
            </SelectTrigger>
            <SelectContent>
              {ACOES_DISPONIVEIS.map(acao => (
                <SelectItem key={acao.value} value={acao.value}>
                  {acao.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ativo */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="ativo"
            checked={formData.ativo}
            onCheckedChange={(checked) => handleChange('ativo', !!checked)}
          />
          <Label htmlFor="ativo" className="cursor-pointer">
            ◾ Ativo?
          </Label>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isCreating}
          >
            ➕ Criar Webhook
          </Button>
          <Button
            variant="outline"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
