import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, GitBranch, Bot, ClipboardList, ArrowRightLeft } from "lucide-react";
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
};

const tipoLabels: Record<string, string> = {
  'etapa_change': 'Mudança de Etapa',
  'funil_change': 'Mudança de Funil',
  'lead_score': 'Lead Score IA',
  'tarefa_auto': 'Tarefa Automática',
};

export const AbaAutomacoes = () => {
  const queryClient = useQueryClient();

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
    onError: (error) => {
      console.error('Erro ao atualizar automação:', error);
      toast.error('Erro ao atualizar automação');
    },
  });

  const handleToggle = (id: string, currentAtivo: boolean) => {
    toggleMutation.mutate({ id, ativo: !currentAtivo });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              <p className="text-sm text-muted-foreground">
                Automações serão exibidas aqui quando disponíveis
              </p>
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
