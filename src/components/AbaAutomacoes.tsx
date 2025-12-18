import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Zap, GitBranch, Bot, ClipboardList, ArrowRightLeft, Plus, Webhook, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AutomacaoConfig {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  gatilho: Record<string, any>;
  acao: Record<string, any>;
  ativo: boolean;
  created_at: string;
}

const tipoIcons: Record<string, React.ReactNode> = {
  'etapa_change': <ArrowRightLeft className="h-4 w-4" />,
  'funil_change': <GitBranch className="h-4 w-4" />,
  'lead_score': <Bot className="h-4 w-4" />,
  'tarefa_auto': <ClipboardList className="h-4 w-4" />,
  'webhook': <Webhook className="h-4 w-4" />,
  'atribuicao': <UserPlus className="h-4 w-4" />,
};

const tipoLabels: Record<string, string> = {
  'etapa_change': 'Mudança de Etapa',
  'funil_change': 'Mudança de Funil',
  'lead_score': 'Lead Score IA',
  'tarefa_auto': 'Tarefa Automática',
  'webhook': 'Webhook Externo',
  'atribuicao': 'Atribuição de Agente',
};

const eventosDisponiveis = [
  { value: 'card_criado', label: 'Card criado' },
  { value: 'card_movido', label: 'Card movido de etapa' },
  { value: 'card_ganho', label: 'Card marcado como Ganho' },
  { value: 'card_perdido', label: 'Card marcado como Perdido' },
  { value: 'message_created', label: 'Nova mensagem recebida' },
  { value: 'lead_score_changed', label: 'Lead Score alterado' },
];

const acoesDisponiveis = [
  { value: 'mover_funil', label: 'Mover para outro funil/etapa' },
  { value: 'criar_tarefa', label: 'Criar tarefa automática' },
  { value: 'recalcular_score', label: 'Recalcular Lead Score' },
  { value: 'disparar_webhook', label: 'Disparar Webhook externo' },
  { value: 'atribuir_agente', label: 'Atribuir a um agente' },
];

export const AbaAutomacoes = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'etapa_change',
    gatilho: { evento: 'card_movido', funil_origem: '', etapa_destino: '', score_minimo: '' },
    acao: { tipo: 'mover_funil', funil_destino: '', etapa_destino: '', url_webhook: '', agente_id: '', dias_prazo: '1', tipo_tarefa: 'Retorno' },
  });

  const { data: automacoes, isLoading } = useQuery({
    queryKey: ['automacoes_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automacoes_config')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as AutomacaoConfig[];
    },
  });

  const { data: funis } = useQuery({
    queryKey: ['funis_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('funis').select('id, nome').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: etapas } = useQuery({
    queryKey: ['etapas_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('etapas').select('id, nome, funil_id').order('ordem');
      if (error) throw error;
      return data;
    },
  });

  const { data: usuarios } = useQuery({
    queryKey: ['usuarios_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('users_crm').select('id, nome, email').eq('status', 'approved');
      if (error) throw error;
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('automacoes_config')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automacoes_config'] });
      toast.success('Automação atualizada');
    },
    onError: () => toast.error('Erro ao atualizar automação'),
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const gatilho: Record<string, any> = { evento: data.gatilho.evento };
      if (data.gatilho.funil_origem) gatilho.funil_origem = data.gatilho.funil_origem;
      if (data.gatilho.etapa_destino) gatilho.etapa_destino = data.gatilho.etapa_destino;
      if (data.gatilho.score_minimo) gatilho.score_minimo = parseInt(data.gatilho.score_minimo);

      const acao: Record<string, any> = { tipo: data.acao.tipo };
      if (data.acao.funil_destino) acao.funil_destino = data.acao.funil_destino;
      if (data.acao.etapa_destino) acao.etapa_destino = data.acao.etapa_destino;
      if (data.acao.url_webhook) acao.url_webhook = data.acao.url_webhook;
      if (data.acao.agente_id) acao.agente_id = data.acao.agente_id;
      if (data.acao.dias_prazo) acao.dias_prazo = parseInt(data.acao.dias_prazo);
      if (data.acao.tipo_tarefa) acao.tipo_tarefa = data.acao.tipo_tarefa;

      const { error } = await supabase.from('automacoes_config').insert({
        nome: data.nome,
        descricao: data.descricao || null,
        tipo: data.tipo,
        gatilho,
        acao,
        ativo: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automacoes_config'] });
      toast.success('Automação criada com sucesso');
      setModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Erro ao criar automação:', error);
      toast.error('Erro ao criar automação');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automacoes_config').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automacoes_config'] });
      toast.success('Automação excluída');
    },
    onError: () => toast.error('Erro ao excluir automação'),
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      tipo: 'etapa_change',
      gatilho: { evento: 'card_movido', funil_origem: '', etapa_destino: '', score_minimo: '' },
      acao: { tipo: 'mover_funil', funil_destino: '', etapa_destino: '', url_webhook: '', agente_id: '', dias_prazo: '1', tipo_tarefa: 'Retorno' },
    });
  };

  const handleToggle = (id: string, currentAtivo: boolean) => {
    toggleMutation.mutate({ id, ativo: !currentAtivo });
  };

  const handleCreate = () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    createMutation.mutate(formData);
  };

  const etapasFiltradas = etapas?.filter(e => 
    !formData.gatilho.funil_origem || e.funil_id === formData.gatilho.funil_origem
  );

  const etapasAcaoFiltradas = etapas?.filter(e => 
    !formData.acao.funil_destino || e.funil_id === formData.acao.funil_destino
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Automações</h2>
            <p className="text-muted-foreground">
              Configure regras automáticas para otimizar seu fluxo de trabalho
            </p>
          </div>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Automação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Automação</DialogTitle>
              <DialogDescription>
                Configure gatilhos e ações para automatizar seu fluxo de trabalho
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Dados básicos */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome da Automação *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Mover para Comercial quando voltar a negociar"
                  />
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descreva o que esta automação faz..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Gatilho */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Gatilho (Quando executar)
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Evento</Label>
                    <Select
                      value={formData.gatilho.evento}
                      onValueChange={(v) => setFormData(prev => ({
                        ...prev,
                        gatilho: { ...prev.gatilho, evento: v }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {eventosDisponiveis.map(e => (
                          <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Funil de Origem (opcional)</Label>
                    <Select
                      value={formData.gatilho.funil_origem || 'all'}
                      onValueChange={(v) => setFormData(prev => ({
                        ...prev,
                        gatilho: { ...prev.gatilho, funil_origem: v === 'all' ? '' : v, etapa_destino: '' }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Qualquer funil" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Qualquer funil</SelectItem>
                        {funis?.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.gatilho.evento === 'card_movido' && (
                    <div>
                      <Label>Etapa de Destino (opcional)</Label>
                      <Select
                        value={formData.gatilho.etapa_destino || 'all'}
                        onValueChange={(v) => setFormData(prev => ({
                          ...prev,
                          gatilho: { ...prev.gatilho, etapa_destino: v === 'all' ? '' : v }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Qualquer etapa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Qualquer etapa</SelectItem>
                          {etapasFiltradas?.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.gatilho.evento === 'lead_score_changed' && (
                    <div>
                      <Label>Score Mínimo</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.gatilho.score_minimo}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          gatilho: { ...prev.gatilho, score_minimo: e.target.value }
                        }))}
                        placeholder="Ex: 70"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Ação */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-primary" />
                  Ação (O que fazer)
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Tipo de Ação</Label>
                    <Select
                      value={formData.acao.tipo}
                      onValueChange={(v) => {
                        const tipoMap: Record<string, string> = {
                          'mover_funil': 'funil_change',
                          'criar_tarefa': 'tarefa_auto',
                          'recalcular_score': 'lead_score',
                          'disparar_webhook': 'webhook',
                          'atribuir_agente': 'atribuicao',
                        };
                        setFormData(prev => ({
                          ...prev,
                          tipo: tipoMap[v] || 'etapa_change',
                          acao: { ...prev.acao, tipo: v }
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {acoesDisponiveis.map(a => (
                          <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.acao.tipo === 'mover_funil' && (
                    <>
                      <div>
                        <Label>Funil de Destino</Label>
                        <Select
                          value={formData.acao.funil_destino}
                          onValueChange={(v) => setFormData(prev => ({
                            ...prev,
                            acao: { ...prev.acao, funil_destino: v, etapa_destino: '' }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o funil" />
                          </SelectTrigger>
                          <SelectContent>
                            {funis?.map(f => (
                              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Etapa de Destino</Label>
                        <Select
                          value={formData.acao.etapa_destino}
                          onValueChange={(v) => setFormData(prev => ({
                            ...prev,
                            acao: { ...prev.acao, etapa_destino: v }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a etapa" />
                          </SelectTrigger>
                          <SelectContent>
                            {etapasAcaoFiltradas?.map(e => (
                              <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {formData.acao.tipo === 'criar_tarefa' && (
                    <>
                      <div>
                        <Label>Tipo de Tarefa</Label>
                        <Select
                          value={formData.acao.tipo_tarefa}
                          onValueChange={(v) => setFormData(prev => ({
                            ...prev,
                            acao: { ...prev.acao, tipo_tarefa: v }
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Retorno">Retorno</SelectItem>
                            <SelectItem value="Ligação">Ligação</SelectItem>
                            <SelectItem value="E-mail">E-mail</SelectItem>
                            <SelectItem value="Reunião">Reunião</SelectItem>
                            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Prazo (dias)</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.acao.dias_prazo}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            acao: { ...prev.acao, dias_prazo: e.target.value }
                          }))}
                        />
                      </div>
                    </>
                  )}

                  {formData.acao.tipo === 'disparar_webhook' && (
                    <div className="col-span-2">
                      <Label>URL do Webhook</Label>
                      <Input
                        type="url"
                        value={formData.acao.url_webhook}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          acao: { ...prev.acao, url_webhook: e.target.value }
                        }))}
                        placeholder="https://exemplo.com/webhook"
                      />
                    </div>
                  )}

                  {formData.acao.tipo === 'atribuir_agente' && (
                    <div className="col-span-2">
                      <Label>Agente</Label>
                      <Select
                        value={formData.acao.agente_id}
                        onValueChange={(v) => setFormData(prev => ({
                          ...prev,
                          acao: { ...prev.acao, agente_id: v }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o agente" />
                        </SelectTrigger>
                        <SelectContent>
                          {usuarios?.map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.nome || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Automação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {automacoes?.map((automacao) => (
          <Card key={automacao.id} className="transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    {tipoIcons[automacao.tipo] || <Zap className="h-4 w-4" />}
                  </div>
                  <div>
                    <CardTitle className="text-base">{automacao.nome}</CardTitle>
                    <CardDescription className="text-sm">
                      {automacao.descricao}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={automacao.ativo ? "default" : "secondary"}>
                    {tipoLabels[automacao.tipo] || automacao.tipo}
                  </Badge>
                  <Switch
                    checked={automacao.ativo}
                    onCheckedChange={() => handleToggle(automacao.id, automacao.ativo)}
                    disabled={toggleMutation.isPending}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(automacao.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted">
                  <span className="font-medium">Gatilho:</span>
                  <span>{(automacao.gatilho as any)?.evento || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted">
                  <span className="font-medium">Ação:</span>
                  <span>{(automacao.acao as any)?.tipo || 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!automacoes || automacoes.length === 0) && (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Zap className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Nenhuma automação configurada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie automações para otimizar seu fluxo de trabalho
              </p>
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Automação
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="p-3 rounded-full bg-primary/10 h-fit">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Lead Score com IA</h4>
              <p className="text-sm text-muted-foreground">
                O sistema analisa automaticamente o histórico de conversas e atividades 
                para calcular a temperatura do lead (Quente, Morno ou Frio). 
                Esta análise é atualizada a cada nova interação quando a automação está ativa.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
