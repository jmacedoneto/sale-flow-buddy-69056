import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, Save, Plus, Send, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import type { CardConversa } from "@/types/database";
import { useUpdateCard, useFunis, useEtapas } from "@/hooks/useFunis";
import { useAtividades, useCreateAtividade } from "@/hooks/useAtividades";
import { AtividadeTimeline } from "./AtividadeTimeline";
import { useChatwootMessages } from "@/hooks/useChatwootMessages";
import { ChatwootMessageTimeline } from "./ChatwootMessageTimeline";
import { useChatwootSync } from "@/hooks/useChatwootSync";
import { useChatwootConfig } from "@/hooks/useChatwootConfig";
import { toast } from "sonner";

interface CardDetailsModalProps {
  card: CardConversa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CardDetailsModal = ({ card, open, onOpenChange }: CardDetailsModalProps) => {
  const [titulo, setTitulo] = useState("");
  const [prazo, setPrazo] = useState<Date | undefined>(undefined);
  const [prioridade, setPrioridade] = useState("");
  const [descricaoDetalhada, setDescricaoDetalhada] = useState("");
  const [resumoComercial, setResumoComercial] = useState("");
  const [novaNota, setNovaNota] = useState("");
  const [funilId, setFunilId] = useState<string>("");
  const [etapaId, setEtapaId] = useState<string>("");
  const [dataRetorno, setDataRetorno] = useState<Date | undefined>(
    new Date(Date.now() + 7 * 86400000)
  );
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  
  const updateCard = useUpdateCard();
  const { data: atividades, isLoading: isLoadingAtividades } = useAtividades(card?.id || null);
  const createAtividade = useCreateAtividade();
  const { data: chatwootMessages, isLoading: isLoadingMessages } = useChatwootMessages(
    card?.chatwoot_conversa_id || null
  );
  const { data: funis } = useFunis();
  const { data: etapas } = useEtapas(funilId || null);
  const { syncChatwoot } = useChatwootSync();
  const { config: chatwootConfig } = useChatwootConfig();

  useEffect(() => {
    if (card) {
      setTitulo(card.titulo || "");
      setPrazo(card.prazo ? new Date(card.prazo) : undefined);
      setPrioridade(card.prioridade || "");
      setDescricaoDetalhada(card.descricao_detalhada || "");
      setResumoComercial(card.resumo_comercial || "");
      setFunilId(card.funil_id || "");
      setEtapaId(card.etapa_id || "");
      setDataRetorno(
        card.data_retorno ? new Date(card.data_retorno) : new Date(Date.now() + 7 * 86400000)
      );
    }
  }, [card]);

  const handleSave = async () => {
    if (!card) return;

    const funilNome = funis?.find(f => f.id === funilId)?.nome || null;
    const funilEtapa = etapas?.find(e => e.id === etapaId)?.nome || null;

    const updates = {
      titulo,
      prazo: prazo ? format(prazo, "yyyy-MM-dd") : null,
      prioridade: prioridade || null,
      descricao_detalhada: descricaoDetalhada || null,
      resumo_comercial: resumoComercial || null,
      funil_id: funilId || null,
      funil_nome: funilNome,
      funil_etapa: funilEtapa,
      data_retorno: dataRetorno ? format(dataRetorno, "yyyy-MM-dd") : null,
    };

    updateCard.mutate(
      { id: card.id, updates },
      {
        onSuccess: async () => {
          // Criar atividade de tarefa agendada
          if (dataRetorno) {
            createAtividade.mutate({
              cardId: card.id,
              tipo: "TAREFA_AGENDADA",
              descricao: `Prazo: ${format(dataRetorno, "dd/MM/yyyy", { locale: ptBR })}`,
            });
          }

          // Sincronizar com Chatwoot se houver conversa vinculada
          if (card.chatwoot_conversa_id && funilNome && funilEtapa && dataRetorno) {
            await syncChatwoot({
              conversation_id: card.chatwoot_conversa_id,
              nome_do_funil: funilNome,
              funil_etapa: funilEtapa,
              data_retorno: dataRetorno.toISOString(),
            });
          }

          onOpenChange(false);
        },
      }
    );
  };

  const handleAddNota = () => {
    if (!card || !novaNota.trim()) return;

    createAtividade.mutate({
      cardId: card.id,
      tipo: "NOTA",
      descricao: novaNota,
    });

    setNovaNota("");
  };

  const handleSendFollowUp = async () => {
    if (!card || !followUpMessage.trim()) return;

    setSendingFollowUp(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/private-message-sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            card_id: card.id,
            message: followUpMessage,
          }),
        }
      );

      const result = await response.json();
      
      if (result.ok) {
        toast.success('Follow-up privado enviado com sucesso');
        setFollowUpMessage('');
      } else if (result.error === 'Card sem funil, ignora') {
        toast.error('Selecione um funil na aba Detalhes antes de enviar o follow-up');
      } else {
        toast.error(result.error || 'Erro ao enviar follow-up');
      }
    } catch (error) {
      console.error('Erro ao enviar follow-up:', error);
      toast.error('Erro ao enviar follow-up privado');
    } finally {
      setSendingFollowUp(false);
    }
  };

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle>Detalhes do Card</DialogTitle>
          <DialogDescription>
            Edite as informações comerciais e acompanhe o histórico
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="detalhes" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="atividades">Atividades CRM</TabsTrigger>
            <TabsTrigger value="chatwoot">Histórico Chatwoot</TabsTrigger>
            <TabsTrigger value="followup">Follow-up Privado</TabsTrigger>
          </TabsList>

          <TabsContent value="detalhes" className="space-y-6 py-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da conversa"
            />
          </div>

          {/* Funil */}
          <div className="space-y-2">
            <Label htmlFor="funil">Funil</Label>
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
            <Label htmlFor="etapa">Etapa</Label>
            <Select value={etapaId} onValueChange={setEtapaId} disabled={!funilId}>
              <SelectTrigger className="w-full bg-background">
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
          </div>

          {/* Data de Retorno */}
          <div className="space-y-2">
            <Label>Data de Retorno *</Label>
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

          {/* Descrição Detalhada */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição Detalhada</Label>
            <Textarea
              id="descricao"
              value={descricaoDetalhada}
              onChange={(e) => setDescricaoDetalhada(e.target.value)}
              placeholder="Descreva os detalhes da conversa..."
              className="min-h-[120px]"
            />
          </div>

          {/* Resumo Comercial */}
          <div className="space-y-2">
            <Label htmlFor="resumo-comercial">Resumo Comercial</Label>
            <Textarea
              id="resumo-comercial"
              value={resumoComercial}
              onChange={(e) => setResumoComercial(e.target.value)}
              placeholder="Resumo comercial da negociação..."
              className="min-h-[120px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="atividades" className="space-y-4 py-4">
            {/* Adicionar Nova Nota */}
            <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
              <Label htmlFor="nova-nota">Nova Nota</Label>
              <Textarea
                id="nova-nota"
                value={novaNota}
                onChange={(e) => setNovaNota(e.target.value)}
                placeholder="Digite sua nota aqui..."
                className="min-h-[80px]"
              />
              <Button 
                onClick={handleAddNota} 
                className="gap-2"
                disabled={!novaNota.trim() || createAtividade.isPending}
              >
                <Plus className="h-4 w-4" />
                Adicionar Nota
              </Button>
            </div>

            {/* Timeline de Atividades */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-foreground">Histórico de Atividades</h4>
              {isLoadingAtividades ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando...
                </div>
              ) : (
                <AtividadeTimeline atividades={atividades || []} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="chatwoot" className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-foreground">
                Histórico de Mensagens do Chatwoot
              </h4>
              {isLoadingMessages ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando mensagens...
                </div>
              ) : !card?.chatwoot_conversa_id ? (
                <div className="text-center py-8 text-muted-foreground">
                  Este card não está vinculado a uma conversa do Chatwoot
                </div>
              ) : (
                <ChatwootMessageTimeline messages={chatwootMessages || []} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="followup" className="space-y-4 py-4">
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-foreground">
                Enviar Follow-up Privado
              </h4>
              
              {!card?.funil_id ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    ⚠️ Selecione um funil na aba "Detalhes" antes de enviar um follow-up privado
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
                  <Label htmlFor="followup-message">Mensagem Privada</Label>
                  <Textarea
                    id="followup-message"
                    value={followUpMessage}
                    onChange={(e) => setFollowUpMessage(e.target.value)}
                    placeholder="Digite seu follow-up privado aqui..."
                    className="min-h-[120px]"
                  />
                  <Button 
                    onClick={handleSendFollowUp}
                    className="gap-2"
                    disabled={!followUpMessage.trim() || sendingFollowUp}
                  >
                    <Send className="h-4 w-4" />
                    {sendingFollowUp ? 'Enviando...' : 'Enviar Follow-up'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Este follow-up será registrado no CRM e, se conectado, enviado como nota privada no Chatwoot
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
