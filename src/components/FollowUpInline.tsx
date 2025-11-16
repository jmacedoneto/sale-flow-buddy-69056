import { useState } from "react";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface FollowUpInlineProps {
  cardId: string;
  onSuccess: () => void;
}

export const FollowUpInline = ({ cardId, onSuccess }: FollowUpInlineProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [data, setData] = useState<Date>();
  const [tipo, setTipo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleSave = async () => {
    if (!data || !tipo) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('atividades_cards')
        .insert({
          card_id: cardId,
          tipo,
          descricao: `Follow-up: ${tipo}`,
          data_prevista: format(data, 'yyyy-MM-dd'),
          status: 'pendente',
          user_id: user?.id,
        });

      if (error) throw error;

      toast.success("Follow-up criado com sucesso");
      setIsAdding(false);
      setData(undefined);
      setTipo("");
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao criar follow-up:", error);
      toast.error(error.message || "Erro ao criar follow-up");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsAdding(true)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Follow-up
      </Button>
    );
  }

  return (
    <div className="space-y-2 p-2 border rounded-md bg-muted/50">
      <div className="flex gap-2">
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Ligação">Ligação</SelectItem>
            <SelectItem value="Email">Email</SelectItem>
            <SelectItem value="WhatsApp">WhatsApp</SelectItem>
            <SelectItem value="Reunião">Reunião</SelectItem>
            <SelectItem value="Outros">Outros</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-start text-left font-normal",
                !data && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {data ? format(data, "PPP", { locale: ptBR }) : "Data"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={data}
              onSelect={setData}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsAdding(false);
            setData(undefined);
            setTipo("");
          }}
          disabled={isLoading}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isLoading || !data || !tipo}
          className="flex-1"
        >
          Salvar
        </Button>
      </div>
    </div>
  );
};
