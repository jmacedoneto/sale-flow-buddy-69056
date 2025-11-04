import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { useState } from "react";
import { useCreateCard, useFunis, useEtapas } from "@/hooks/useFunis";
import { useChatwootSync } from "@/hooks/useChatwootSync";
import { useCreateAtividade } from "@/hooks/useAtividades";
import { cardSchema } from "@/lib/validationSchemas";

interface CreateCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateCardModal = ({ open, onOpenChange }: CreateCardModalProps) => {
  const [titulo, setTitulo] = useState("");
  const [funilId, setFunilId] = useState("");
  const [etapaId, setEtapaId] = useState("");
  const [resumo, setResumo] = useState("");
  const [prazo, setPrazo] = useState<Date | undefined>(undefined);
  const [prioridade, setPrioridade] = useState("");
  const [dataRetorno, setDataRetorno] = useState<Date | undefined>(
    new Date(Date.now() + 7 * 86400000)
  );
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const createCard = useCreateCard();
  const { data: funis } = useFunis();
  const { data: etapas } = useEtapas(funilId || null);
  const { syncChatwoot } = useChatwootSync();
  const createAtividade = useCreateAtividade();

  const handleCreate = async () => {
    try {
      const validated = cardSchema.parse({
        titulo,
        etapa_id: etapaId,
        resumo: resumo || undefined,
        prazo,
        prioridade: prioridade || undefined,
        data_retorno: dataRetorno,
      });

      const funilNome = funis?.find(f => f.id === funilId)?.nome || null;
      const funilEtapa = etapas?.find(e => e.id === etapaId)?.nome || null;

      createCard.mutate(
        {
          titulo: validated.titulo,
          etapa_id: validated.etapa_id,
          resumo: validated.resumo || null,
          prazo: validated.prazo ? format(validated.prazo, "yyyy-MM-dd") : null,
          prioridade: validated.prioridade || null,
          funil_id: funilId || null,
          funil_nome: funilNome,
          funil_etapa: funilEtapa,
          data_retorno: validated.data_retorno ? format(validated.data_retorno, "yyyy-MM-dd") : null,
        },
        {
          onSuccess: async (newCard: any) => {
            // Criar atividade de tarefa agendada
            if (validated.data_retorno && newCard?.id) {
              createAtividade.mutate({
                cardId: newCard.id,
                tipo: "TAREFA_AGENDADA",
                descricao: `Prazo: ${format(validated.data_retorno, "dd/MM/yyyy", { locale: ptBR })}`,
              });
            }

            // Sincronizar com Chatwoot se houver conversa vinculada
            if (newCard?.chatwoot_conversa_id && funilNome && funilEtapa && validated.data_retorno) {
              await syncChatwoot({
                conversation_id: newCard.chatwoot_conversa_id,
                nome_do_funil: funilNome,
                funil_etapa: funilEtapa,
                data_retorno: validated.data_retorno.toISOString(),
              });
            }

            // Reset form
            setTitulo("");
            setFunilId("");
            setEtapaId("");
            setResumo("");
            setPrazo(undefined);
            setPrioridade("");
            setDataRetorno(new Date(Date.now() + 7 * 86400000));
            setErrors({});
            onOpenChange(false);
          },
        }
      );
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        const zodError = error as any;
        const fieldErrors: { [key: string]: string } = {};
        zodError.errors?.forEach((err: any) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle>Novo Card</DialogTitle>
          <DialogDescription>
            Crie um novo card de conversa no funil
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="titulo">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da conversa"
              className={errors.titulo ? "border-destructive" : ""}
            />
            {errors.titulo && (
              <p className="text-sm text-destructive">{errors.titulo}</p>
            )}
          </div>

          {/* Funil */}
          <div className="space-y-2">
            <Label htmlFor="funil">
              Funil <span className="text-destructive">*</span>
            </Label>
            <Select value={funilId} onValueChange={(value) => { setFunilId(value); setEtapaId(""); }}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Selecione o funil" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {funis?.map((funil) => (
                  <SelectItem key={funil.id} value={funil.id}>
                    {funil.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Etapa */}
          <div className="space-y-2">
            <Label htmlFor="etapa">
              Etapa <span className="text-destructive">*</span>
            </Label>
            <Select value={etapaId} onValueChange={setEtapaId} disabled={!funilId}>
              <SelectTrigger className={cn("w-full bg-background", errors.etapa_id && "border-destructive")}>
                <SelectValue placeholder="Selecione a etapa" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {etapas?.map((etapa) => (
                  <SelectItem key={etapa.id} value={etapa.id}>
                    {etapa.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.etapa_id && (
              <p className="text-sm text-destructive">{errors.etapa_id}</p>
            )}
          </div>

          {/* Data de Retorno */}
          <div className="space-y-2">
            <Label>
              Data de Retorno <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataRetorno && "text-muted-foreground",
                    errors.data_retorno && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataRetorno ? format(dataRetorno, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                <Calendar
                  mode="single"
                  selected={dataRetorno}
                  onSelect={setDataRetorno}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {errors.data_retorno && (
              <p className="text-sm text-destructive">{errors.data_retorno}</p>
            )}
          </div>

          {/* Resumo */}
          <div className="space-y-2">
            <Label htmlFor="resumo">Resumo</Label>
            <Textarea
              id="resumo"
              value={resumo}
              onChange={(e) => setResumo(e.target.value)}
              placeholder="Resumo da conversa..."
              className="min-h-[100px]"
            />
          </div>

          {/* Prazo */}
          <div className="space-y-2">
            <Label>Prazo (opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !prazo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {prazo ? format(prazo, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                <Calendar
                  mode="single"
                  selected={prazo}
                  onSelect={setPrazo}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <Label htmlFor="prioridade">Prioridade</Label>
            <Select value={prioridade} onValueChange={setPrioridade}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Selecione a prioridade" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreate} 
            className="gap-2"
            disabled={createCard.isPending}
          >
            <Plus className="h-4 w-4" />
            Criar Card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
