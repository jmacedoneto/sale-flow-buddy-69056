import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Phone, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface QuickActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  cardTitle: string;
  telefone?: string | null;
}

export const QuickActivityModal = ({
  isOpen,
  onClose,
  cardId,
  cardTitle,
  telefone
}: QuickActivityModalProps) => {
  const [tipo, setTipo] = useState("Tentativa de Contato");
  const [descricao, setDescricao] = useState("");
  const [dataRetorno, setDataRetorno] = useState<Date>(addDays(new Date(), 1));
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!descricao.trim()) {
      toast.error("Preencha a descrição da atividade");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('atividades_cards').insert({
        card_id: cardId,
        tipo,
        descricao,
        data_prevista: format(dataRetorno, 'yyyy-MM-dd'),
        status: 'pendente'
      });

      if (error) throw error;

      // Atualizar data_retorno do card
      await supabase
        .from('cards_conversas')
        .update({ data_retorno: format(dataRetorno, 'yyyy-MM-dd') })
        .eq('id', cardId);

      toast.success("Atividade registrada!");
      queryClient.invalidateQueries({ queryKey: ['atividades'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      onClose();
      setDescricao("");
    } catch (error) {
      console.error("Erro ao criar atividade:", error);
      toast.error("Erro ao registrar atividade");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPhone = () => {
    if (telefone) {
      navigator.clipboard.writeText(telefone);
      toast.success("Telefone copiado!");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Registrar Contato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Card</p>
            <p className="font-medium">{cardTitle}</p>
          </div>

          {telefone && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono">{telefone}</span>
              <Button variant="ghost" size="sm" onClick={handleCopyPhone}>
                Copiar
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Atividade</label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tentativa de Contato">Tentativa de Contato</SelectItem>
                <SelectItem value="Ligação Realizada">Ligação Realizada</SelectItem>
                <SelectItem value="Ligação Não Atendida">Ligação Não Atendida</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o contato realizado..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Próximo Retorno</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dataRetorno, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataRetorno}
                  onSelect={(date) => date && setDataRetorno(date)}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
