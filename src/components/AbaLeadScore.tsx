import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, TrendingUp, Flame, Snowflake, ThermometerSun, Plus, Trash2, Edit2, Target, Zap } from "lucide-react";
import { toast } from "sonner";

interface LeadScoreConfig {
  id: string;
  categoria: string;
  criterio: string;
  descricao: string | null;
  pontos: number;
  ativo: boolean;
  funil_id: string | null;
  created_at: string;
}

const categoriaLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'qualificacao': { label: 'Qualificação', icon: <Target className="h-4 w-4" />, color: 'text-emerald-600' },
  'interacao': { label: 'Interação', icon: <Zap className="h-4 w-4" />, color: 'text-blue-600' },
  'comportamento': { label: 'Comportamento', icon: <TrendingUp className="h-4 w-4" />, color: 'text-purple-600' },
  'tempo': { label: 'Tempo', icon: <ThermometerSun className="h-4 w-4" />, color: 'text-orange-600' },
};

export const AbaLeadScore = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LeadScoreConfig | null>(null);
  const [formData, setFormData] = useState({
    categoria: 'qualificacao',
    criterio: '',
    descricao: '',
    pontos: '10',
    funil_id: '',
  });

  const { data: criterios, isLoading } = useQuery({
    queryKey: ['lead_score_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_score_config')
        .select('*')
        .order('categoria')
        .order('pontos', { ascending: false });

      if (error) throw error;
      return data as LeadScoreConfig[];
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

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('lead_score_config')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_score_config'] });
      toast.success('Critério atualizado');
    },
    onError: () => toast.error('Erro ao atualizar critério'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        categoria: data.categoria,
        criterio: data.criterio,
        descricao: data.descricao || null,
        pontos: parseInt(data.pontos),
        funil_id: data.funil_id || null,
      };

      if (data.id) {
        const { error } = await supabase
          .from('lead_score_config')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lead_score_config')
          .insert({ ...payload, ativo: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_score_config'] });
      toast.success(editingItem ? 'Critério atualizado' : 'Critério criado');
      handleCloseModal();
    },
    onError: () => toast.error('Erro ao salvar critério'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lead_score_config').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_score_config'] });
      toast.success('Critério excluído');
    },
    onError: () => toast.error('Erro ao excluir critério'),
  });

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setFormData({
      categoria: 'qualificacao',
      criterio: '',
      descricao: '',
      pontos: '10',
      funil_id: '',
    });
  };

  const handleEdit = (item: LeadScoreConfig) => {
    setEditingItem(item);
    setFormData({
      categoria: item.categoria,
      criterio: item.criterio,
      descricao: item.descricao || '',
      pontos: item.pontos.toString(),
      funil_id: item.funil_id || '',
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.criterio.trim()) {
      toast.error('Critério é obrigatório');
      return;
    }
    saveMutation.mutate({ ...formData, id: editingItem?.id });
  };

  // Agrupar por categoria
  const criteriosPorCategoria = criterios?.reduce((acc, item) => {
    if (!acc[item.categoria]) acc[item.categoria] = [];
    acc[item.categoria].push(item);
    return acc;
  }, {} as Record<string, LeadScoreConfig[]>) || {};

  // Calcular score total possível
  const scoreTotalPositivo = criterios?.filter(c => c.ativo && c.pontos > 0).reduce((sum, c) => sum + c.pontos, 0) || 0;
  const scoreTotalNegativo = criterios?.filter(c => c.ativo && c.pontos < 0).reduce((sum, c) => sum + c.pontos, 0) || 0;

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
          <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20">
            <Flame className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Lead Score</h2>
            <p className="text-muted-foreground">
              Configure critérios de pontuação para classificar leads automaticamente
            </p>
          </div>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingItem(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Critério
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Critério' : 'Novo Critério de Pontuação'}</DialogTitle>
              <DialogDescription>
                Defina critérios que adicionam ou removem pontos do lead score
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Categoria</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, categoria: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qualificacao">Qualificação</SelectItem>
                    <SelectItem value="interacao">Interação</SelectItem>
                    <SelectItem value="comportamento">Comportamento</SelectItem>
                    <SelectItem value="tempo">Tempo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Critério (identificador único)</Label>
                <Input
                  value={formData.criterio}
                  onChange={(e) => setFormData(prev => ({ ...prev, criterio: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                  placeholder="Ex: respondeu_rapido"
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Ex: Lead respondeu em menos de 1 hora"
                />
              </div>

              <div>
                <Label>Pontos (negativo para penalizar)</Label>
                <Input
                  type="number"
                  value={formData.pontos}
                  onChange={(e) => setFormData(prev => ({ ...prev, pontos: e.target.value }))}
                  placeholder="Ex: 10 ou -15"
                />
              </div>

              <div>
                <Label>Funil específico (opcional)</Label>
                <Select
                  value={formData.funil_id || 'all'}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, funil_id: v === 'all' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os funis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os funis</SelectItem>
                    {funis?.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseModal}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingItem ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo do Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Score Máximo Possível</p>
                <p className="text-2xl font-bold text-emerald-600">+{scoreTotalPositivo}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-500/20">
                <Snowflake className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Penalização Máxima</p>
                <p className="text-2xl font-bold text-red-600">{scoreTotalNegativo}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/20">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Critérios Ativos</p>
                <p className="text-2xl font-bold text-blue-600">
                  {criterios?.filter(c => c.ativo).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Escala de Classificação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Classificação de Leads</CardTitle>
          <CardDescription>Como o score é convertido em categoria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <Snowflake className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Frio: 0-39 pontos</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <ThermometerSun className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Morno: 40-69 pontos</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <Flame className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Quente: 70+ pontos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critérios por Categoria */}
      <div className="space-y-4">
        {Object.entries(categoriaLabels).map(([categoria, info]) => {
          const items = criteriosPorCategoria[categoria] || [];
          if (items.length === 0 && !['qualificacao', 'interacao', 'comportamento', 'tempo'].includes(categoria)) return null;

          return (
            <Card key={categoria}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <span className={info.color}>{info.icon}</span>
                  <CardTitle className="text-base">{info.label}</CardTitle>
                  <Badge variant="secondary" className="ml-2">{items.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum critério nesta categoria</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          item.ativo ? 'bg-background' : 'bg-muted/50 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={item.pontos > 0 ? 'default' : 'destructive'}
                            className="min-w-[60px] justify-center"
                          >
                            {item.pontos > 0 ? '+' : ''}{item.pontos} pts
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{item.descricao || item.criterio}</p>
                            <p className="text-xs text-muted-foreground">{item.criterio}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.ativo}
                            onCheckedChange={() => toggleMutation.mutate({ id: item.id, ativo: !item.ativo })}
                            disabled={toggleMutation.isPending}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(item.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dica */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="p-3 rounded-full bg-primary/10 h-fit">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Automação por Score</h4>
              <p className="text-sm text-muted-foreground">
                Configure automações na aba "Automações" usando o gatilho "Lead Score alterado" 
                com um score mínimo. Por exemplo: quando o score atingir 70 pontos, 
                mover automaticamente o card para o funil principal.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
