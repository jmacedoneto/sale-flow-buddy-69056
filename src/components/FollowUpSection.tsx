import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  CalendarIcon, 
  Plus, 
  Check, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Phone,
  MessageSquare,
  Users,
  FileText,
  Pin
} from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { AtividadeCard } from "@/types/database";

interface FollowUpSectionProps {
  atividades: AtividadeCard[];
  onCreateFollowUp: (data: {
    tipo: string;
    descricao: string;
    dataPrevista?: Date;
  }) => Promise<void>;
  onCompleteFollowUp: (id: string) => Promise<void>;
  isCreating: boolean;
}

export const FollowUpSection = ({
  atividades,
  onCreateFollowUp,
  onCompleteFollowUp,
  isCreating,
}: FollowUpSectionProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tipo, setTipo] = useState("Ligação");
  const [descricao, setDescricao] = useState("");
  const [dataPrevista, setDataPrevista] = useState<Date | undefined>(
    new Date(Date.now() + 7 * 86400000)
  );

  // Filtrar apenas follow-ups (não notas ou mudanças de etapa)
  const followUpTypes = ['Ligação', 'Mensagem', 'Reunião', 'Follow-up', 'Outro', 'FOLLOW_UP'];
  const followUps = atividades.filter(a => 
    followUpTypes.includes(a.tipo) || a.data_prevista
  );

  const pendentes = followUps.filter(a => a.status === 'pendente' || !a.data_conclusao);
  const concluidos = followUps.filter(a => a.status === 'concluido' || a.data_conclusao);

  const handleSubmit = async () => {
    if (!descricao.trim()) return;
    
    await onCreateFollowUp({
      tipo,
      descricao,
      dataPrevista,
    });

    // Reset form
    setDescricao("");
    setTipo("Ligação");
    setDataPrevista(new Date(Date.now() + 7 * 86400000));
    setShowCreateForm(false);
  };

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'Ligação': return <Phone className="h-3.5 w-3.5" />;
      case 'Mensagem': return <MessageSquare className="h-3.5 w-3.5" />;
      case 'Reunião': return <Users className="h-3.5 w-3.5" />;
      case 'Follow-up':
      case 'FOLLOW_UP': return <FileText className="h-3.5 w-3.5" />;
      default: return <Pin className="h-3.5 w-3.5" />;
    }
  };

  const getDateStatus = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    if (isPast(d) && !isToday(d)) return { label: 'Vencido', variant: 'destructive' as const };
    if (isToday(d)) return { label: 'Hoje', variant: 'default' as const };
    if (isTomorrow(d)) return { label: 'Amanhã', variant: 'secondary' as const };
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header com botão de criar */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Follow-ups
          {pendentes.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendentes.length} pendente{pendentes.length > 1 ? 's' : ''}
            </Badge>
          )}
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="h-7 text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Criar
        </Button>
      </div>

      {/* Formulário de criação */}
      <Collapsible open={showCreateForm} onOpenChange={setShowCreateForm}>
        <CollapsibleContent className="space-y-3 bg-muted/30 rounded-lg p-3 border">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-8 text-xs">
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

            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-8 w-full justify-start text-left text-xs font-normal",
                      !dataPrevista && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {dataPrevista ? format(dataPrevista, "dd/MM/yy", { locale: ptBR }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataPrevista}
                    onSelect={setDataPrevista}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva a atividade..."
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={!descricao.trim() || isCreating}
            size="sm"
            className="w-full h-8"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Criar Follow-up
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Lista de Pendentes */}
      {pendentes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pendentes
          </p>
          <div className="space-y-2">
            {pendentes.map((followUp) => {
              const dateStatus = getDateStatus(followUp.data_prevista);
              return (
                <div
                  key={followUp.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border bg-card transition-colors",
                    dateStatus?.variant === 'destructive' && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                      {getTypeIcon(followUp.tipo)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-foreground">
                        {followUp.tipo}
                      </span>
                      {followUp.data_prevista && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(followUp.data_prevista), "dd/MM", { locale: ptBR })}
                        </span>
                      )}
                      {dateStatus && (
                        <Badge variant={dateStatus.variant} className="text-[10px] h-4 px-1.5">
                          {dateStatus.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {followUp.descricao}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => onCompleteFollowUp(followUp.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de Concluídos */}
      {concluidos.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between h-7 text-xs text-muted-foreground">
              <span>Concluídos ({concluidos.length})</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {concluidos.slice(0, 5).map((followUp) => (
              <div
                key={followUp.id}
                className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 opacity-75"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="p-1 rounded-full bg-success/20 text-success">
                    <Check className="h-3 w-3" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{followUp.tipo}</span>
                    {followUp.data_conclusao && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(followUp.data_conclusao), "dd/MM", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {followUp.descricao}
                  </p>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Empty state */}
      {followUps.length === 0 && !showCreateForm && (
        <div className="text-center py-6 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum follow-up agendado</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => setShowCreateForm(true)}
            className="mt-1"
          >
            Criar primeiro follow-up
          </Button>
        </div>
      )}
    </div>
  );
};
