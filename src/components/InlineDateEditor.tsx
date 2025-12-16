import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface InlineDateEditorProps {
  cardId: string;
  currentDate: string | null;
  onUpdate?: () => void;
}

export const InlineDateEditor = ({ cardId, currentDate, onUpdate }: InlineDateEditorProps) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleSelect = async (date: Date | undefined) => {
    if (!date) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('cards_conversas')
        .update({ data_retorno: format(date, 'yyyy-MM-dd') })
        .eq('id', cardId);

      if (error) throw error;

      toast.success("Data de retorno atualizada!");
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['funil-cards'] });
      setOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao atualizar data:", error);
      toast.error("Erro ao atualizar data");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-auto p-1 font-normal hover:bg-muted"
          onClick={(e) => e.stopPropagation()}
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <CalendarIcon className="h-3 w-3 mr-1 text-muted-foreground" />
          )}
          {currentDate ? (
            format(new Date(currentDate), "dd/MM/yyyy", { locale: ptBR })
          ) : (
            <span className="text-muted-foreground">Sem data</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
        <Calendar
          mode="single"
          selected={currentDate ? new Date(currentDate) : undefined}
          onSelect={handleSelect}
          locale={ptBR}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
};
