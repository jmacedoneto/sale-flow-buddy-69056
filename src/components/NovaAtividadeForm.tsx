import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCreateAtividade } from "@/hooks/useAtividades";
import { toast } from "sonner";

interface NovaAtividadeFormProps {
  cardId: string;
  conversationId?: number | null;
  onSuccess?: () => void;
}

/**
 * Formulário para criar nova atividade (substitui campo "Prazo")
 * Permite definir: data de retorno, tipo, descrição
 */
export const NovaAtividadeForm = ({ cardId, conversationId, onSuccess }: NovaAtividadeFormProps) => {
  const [dataRetorno, setDataRetorno] = useState<Date | undefined>(
    new Date(Date.now() + 7 * 86400000) // 7 dias
  );
  const [tipo, setTipo] = useState("Ligação");
  const [descricao, setDescricao] = useState("");

  const createAtividade = useCreateAtividade();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descricao.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }

    try {
      await createAtividade.mutateAsync({
        cardId,
        tipo,
        descricao: `[${tipo}] ${descricao}${dataRetorno ? ` - Retorno: ${format(dataRetorno, "dd/MM/yyyy")}` : ""}`,
        sendToChatwoot: true,
        conversationId: conversationId || undefined,
      });

      // Limpar formulário
      setDescricao("");
      setTipo("Ligação");
      setDataRetorno(new Date(Date.now() + 7 * 86400000));

      toast.success("Atividade criada e enviada ao Chatwoot!");
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao criar atividade:", error);
      toast.error("Erro ao criar atividade");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          Nova Atividade
        </CardTitle>
        <CardDescription>
          Agendar retorno, ligação ou reunião
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Atividade */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ligação">📞 Ligação</SelectItem>
                <SelectItem value="Mensagem">💬 Mensagem</SelectItem>
                <SelectItem value="Reunião">🤝 Reunião</SelectItem>
                <SelectItem value="Follow-up">📋 Follow-up</SelectItem>
                <SelectItem value="Outro">📌 Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data de Retorno */}
          <div className="space-y-2">
            <Label>Data de Retorno</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataRetorno && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataRetorno ? (
                    format(dataRetorno, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  ) : (
                    "Selecione uma data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataRetorno}
                  onSelect={setDataRetorno}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Ligar para apresentar nova proposta comercial"
              className="min-h-[80px]"
              required
            />
          </div>

          {/* Botão Criar */}
          <Button
            type="submit"
            className="w-full"
            disabled={createAtividade.isPending || !descricao.trim()}
          >
            {createAtividade.isPending ? "Criando..." : "Criar Atividade"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
