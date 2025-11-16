import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AtividadeRetornoModalProps {
  isOpen: boolean;
  onClose: () => void;
  atividade: {
    id: string;
    descricao: string;
    tipo: string;
    data_prevista?: string;
  };
  onSuccess: () => void;
}

export const AtividadeRetornoModal = ({ 
  isOpen, 
  onClose, 
  atividade,
  onSuccess 
}: AtividadeRetornoModalProps) => {
  const [observacao, setObservacao] = useState("");
  const [novaData, setNovaData] = useState<Date>();
  const [isLoading, setIsLoading] = useState(false);

  const handlePostergar = async () => {
    setIsLoading(true);
    try {
      // Buscar próximo dia útil usando a função do banco
      const { data: proximoDiaUtil, error: dateError } = await supabase
        .rpc('proximo_dia_util', { data_base: new Date().toISOString().split('T')[0] });

      if (dateError) throw dateError;

      const { error } = await supabase
        .from('atividades_cards')
        .update({
          status: 'postergada',
          observacao,
          data_prevista: proximoDiaUtil,
        })
        .eq('id', atividade.id);

      if (error) throw error;

      toast.success("Atividade postergada para próximo dia útil");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro ao postergar:", error);
      toast.error(error.message || "Erro ao postergar atividade");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostergarData = async () => {
    if (!novaData) {
      toast.error("Selecione uma nova data");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('atividades_cards')
        .update({
          status: 'postergada',
          observacao,
          data_prevista: format(novaData, 'yyyy-MM-dd'),
        })
        .eq('id', atividade.id);

      if (error) throw error;

      toast.success("Atividade postergada");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro ao postergar:", error);
      toast.error(error.message || "Erro ao postergar atividade");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConcluir = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('atividades_cards')
        .update({
          status: 'concluida',
          observacao,
          data_conclusao: new Date().toISOString(),
        })
        .eq('id', atividade.id);

      if (error) throw error;

      toast.success("Atividade concluída");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro ao concluir:", error);
      toast.error(error.message || "Erro ao concluir atividade");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Registrar Retorno - {atividade.tipo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Atividade:</p>
            <p className="text-sm">{atividade.descricao}</p>
          </div>

          <div>
            <label className="text-sm font-medium">Observações do Retorno</label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva o retorno da atividade..."
              className="mt-2 min-h-[100px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePostergar}
              disabled={isLoading}
              className="flex-1"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Postergar Próximo Dia Útil
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !novaData && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {novaData ? format(novaData, "PPP", { locale: ptBR }) : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={novaData}
                  onSelect={setNovaData}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="secondary"
              onClick={handlePostergarData}
              disabled={isLoading || !novaData}
            >
              Postergar
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConcluir} disabled={isLoading}>
            Concluir Atividade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
