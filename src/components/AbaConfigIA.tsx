import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const AbaConfigIA = () => {
  const queryClient = useQueryClient();
  const [promptGlobal, setPromptGlobal] = useState("");
  const [promptResumo, setPromptResumo] = useState("");

  const { data: config, isLoading } = useQuery({
    queryKey: ["ai-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_config")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      
      setPromptGlobal(data.prompt_assistente_global);
      setPromptResumo(data.prompt_resumo_comercial);
      
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!config?.id) throw new Error("Configuração não encontrada");

      const { error } = await supabase
        .from("ai_config")
        .update({
          prompt_assistente_global: promptGlobal,
          prompt_resumo_comercial: promptResumo,
        })
        .eq("id", config.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-config"] });
      toast.success("Configurações de IA atualizadas com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar configurações:", error);
      toast.error("Erro ao atualizar configurações de IA");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Configurações de IA</h2>
        <p className="text-muted-foreground">
          Configure os prompts personalizados para o assistente de IA do CRM.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prompt-global">Prompt do Assistente Global</Label>
          <Textarea
            id="prompt-global"
            value={promptGlobal}
            onChange={(e) => setPromptGlobal(e.target.value)}
            placeholder="Digite o prompt para o assistente global..."
            className="min-h-[120px]"
          />
          <p className="text-sm text-muted-foreground">
            Este prompt define o comportamento do assistente IA no chat flutuante.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt-resumo">Prompt do Resumo Comercial</Label>
          <Textarea
            id="prompt-resumo"
            value={promptResumo}
            onChange={(e) => setPromptResumo(e.target.value)}
            placeholder="Digite o prompt para geração de resumos..."
            className="min-h-[120px]"
          />
          <p className="text-sm text-muted-foreground">
            Este prompt é usado para gerar análises comerciais automáticas dos cards.
          </p>
        </div>

        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};
