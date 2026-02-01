import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, Loader2, AlertCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useChatwootContext } from "@/contexts/ChatwootContext";
import { getCardByConversationId, createFollowUpActivity } from "@/services/cardLookupService";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FollowUpModal = ({ isOpen, onClose }: FollowUpModalProps) => {
  const { conversationId, contact, notifyFollowUpComplete, notifyError } = useChatwootContext();
  const { user } = useAuth();

  const [tipo, setTipo] = useState("Ligação");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState<Date>(addDays(new Date(), 1));
  
  const [cardId, setCardId] = useState<string | null>(null);
  const [cardNotFound, setCardNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar card existente
  useEffect(() => {
    const fetchCard = async () => {
      if (!conversationId) {
        setIsLoading(false);
        setCardNotFound(true);
        return;
      }

      try {
        const card = await getCardByConversationId(conversationId);
        if (card) {
          setCardId(card.id);
          setCardNotFound(false);
        } else {
          setCardNotFound(true);
        }
      } catch (error) {
        console.error("[FollowUpModal] Erro ao buscar card:", error);
        setCardNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      setIsLoading(true);
      fetchCard();
    }
  }, [conversationId, isOpen]);

  const handleSubmit = async () => {
    if (!cardId) {
      toast.error("Nenhum card encontrado para esta conversa");
      return;
    }

    if (!tipo || !data) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      const dataPrevista = format(data, 'yyyy-MM-dd');
      const descFinal = descricao.trim() || `Follow-up: ${tipo}`;

      const activityId = await createFollowUpActivity({
        cardId,
        tipo,
        descricao: descFinal,
        dataPrevista,
        userId: user?.id,
      });

      toast.success("Follow-up agendado com sucesso!");

      // Notificar Chatwoot
      notifyFollowUpComplete({
        activityId,
        scheduledDate: dataPrevista,
      });

      // Reset form
      setDescricao("");
      setTipo("Ligação");
      setData(addDays(new Date(), 1));
      
      onClose();
    } catch (error: any) {
      console.error("[FollowUpModal] Erro:", error);
      toast.error(error.message || "Erro ao agendar follow-up");
      notifyError(error.message || "followup_error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Agendar Follow-up
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : cardNotFound ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div className="text-center">
              <p className="font-medium">Card não encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Primeiro adicione esta conversa ao Kanban.
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        ) : (
          <>
            {/* Info do contato */}
            {contact && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium">{contact.name}</p>
                {contact.phone && <p className="text-muted-foreground">{contact.phone}</p>}
              </div>
            )}

            <div className="space-y-4">
              {/* Tipo de atividade */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Atividade</label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ligação">Ligação</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Email">Email</SelectItem>
                    <SelectItem value="Reunião">Reunião</SelectItem>
                    <SelectItem value="Visita">Visita</SelectItem>
                    <SelectItem value="Proposta">Enviar Proposta</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data do Follow-up</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !data && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {data ? format(data, "PPP", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={data}
                      onSelect={(date) => date && setData(date)}
                      locale={ptBR}
                      className="pointer-events-auto"
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Observação (opcional)</label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o que será feito..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Agendar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
