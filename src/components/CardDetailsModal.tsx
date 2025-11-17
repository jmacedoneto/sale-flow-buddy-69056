import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Save, Plus, MessageSquare, Activity, Info, Sparkles, Trophy, X, Pause, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import type { CardConversa } from "@/types/database";
import { useUpdateCard, useFunis, useEtapas } from "@/hooks/useFunis";
import { useAtividades, useCreateAtividade } from "@/hooks/useAtividades";
import { AtividadeTimeline } from "./AtividadeTimeline";
import { ChatInbox } from "./chat/ChatInbox";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ModalMotivoPerda } from "./ModalMotivoPerda";
import { CardProdutosManager } from "./CardProdutosManager";
import { useChatwootConfig } from "@/hooks/useChatwootConfig";

interface CardDetailsModalProps {
  card: CardConversa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CardDetailsModal = ({ card, open, onOpenChange }: CardDetailsModalProps) => {
  const [titulo, setTitulo] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [descricaoDetalhada, setDescricaoDetalhada] = useState("");
  const [resumoComercial, setResumoComercial] = useState("");
  const [novaNota, setNovaNota] = useState("");
  const [funilId, setFunilId] = useState<string>("");
  const [etapaId, setEtapaId] = useState<string>("");
  const [isGeneratingResumo, setIsGeneratingResumo] = useState(false);
  const [modalPerdaOpen, setModalPerdaOpen] = useState(false);
  
  // Follow-up form states
  const [followUpData, setFollowUpData] = useState<Date | undefined>(
    new Date(Date.now() + 7 * 86400000)
  );
  const [followUpTipo, setFollowUpTipo] = useState("Ligação");
  const [followUpDescricao, setFollowUpDescricao] = useState("");
  
  const updateCard = useUpdateCard();
  const { atividades, loading: isLoadingAtividades } = useAtividades(card?.id || null);
  const createAtividade = useCreateAtividade();
  const { data: funis } = useFunis();
  const { data: etapas } = useEtapas(funilId || null);
  const { config } = useChatwootConfig();

  useEffect(() => {
    if (card) {
      setTitulo(card.titulo || "");
      setPrioridade(card.prioridade || "");
      setDescricaoDetalhada(card.descricao_detalhada || "");
      setResumoComercial(card.resumo_comercial || "");
      setFunilId(card.funil_id || "");
      setEtapaId(card.etapa_id || "");
      
      // Gerar resumo comercial automaticamente se não existir
      if (!card.resumo_comercial && card.chatwoot_conversa_id) {
        handleGerarResumo();
      }
    }
  }, [card]);

  const handleSave = async () => {
    if (!card) return;

    const funilNome = funis?.find(f => f.id === funilId)?.nome || null;
    const funilEtapa = etapas?.find(e => e.id === etapaId)?.nome || null;

    const updates = {
      titulo,
      prioridade: prioridade || null,
      descricao_detalhada: descricaoDetalhada || null,
      resumo_comercial: resumoComercial || null,
      funil_id: funilId || null,
      etapa_id: etapaId || null,
      funil_nome: funilNome,
      funil_etapa: funilEtapa,
    };

    updateCard.mutate(
      { id: card.id, updates },
      {
        onSuccess: async () => {
          toast.success("Card atualizado!");
          
          // Sincronizar com Chatwoot se houver conversation_id
          if (card.chatwoot_conversa_id) {
            try {
              await supabase.functions.invoke('sync-card-to-chatwoot', {
                body: { 
                  conversation_id: card.chatwoot_conversa_id,
                  label: funilNome,
                  etapa_comercial: funilEtapa,
                }
              });
            } catch (error) {
              console.error("Erro ao sincronizar com Chatwoot:", error);
            }
          }
        },
        onError: (error) => {
          console.error("Erro ao atualizar card:", error);
          toast.error("Erro ao atualizar card");
        },
      }
    );
  };

  const handleAdicionarNota = async () => {
    if (!card || !novaNota.trim()) return;

    try {
      await createAtividade.mutateAsync({
        cardId: card.id,
        tipo: "Nota",
        descricao: novaNota,
        sendToChatwoot: true,
        conversationId: card.chatwoot_conversa_id || undefined,
      });

      setNovaNota("");
      toast.success("Nota adicionada e enviada ao Chatwoot!");
    } catch (error) {
      console.error("Erro ao adicionar nota:", error);
      toast.error("Erro ao adicionar nota");
    }
  };

  const handleCriarFollowUp = async () => {
    console.log('followUpData:', followUpData, 'followUpDescricao:', followUpDescricao);
    
    if (!card || !followUpDescricao.trim()) {
      toast.error("Descrição do follow-up é obrigatória");
      return;
    }

    try {
      await createAtividade.mutateAsync({
        cardId: card.id,
        tipo: followUpTipo,
        descricao: followUpDescricao,
        dataPrevista: followUpData ? followUpData.toISOString() : undefined,
        sendToChatwoot: true,
        conversationId: card.chatwoot_conversa_id || undefined,
      });

      // Limpar formulário
      setFollowUpDescricao("");
      setFollowUpTipo("Ligação");
      setFollowUpData(new Date(Date.now() + 7 * 86400000));
      
      toast.success("Follow-up criado e enviado ao Chatwoot!");
    } catch (error) {
      console.error("Erro ao criar follow-up:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar follow-up");
    }
  };

  const handleGerarResumo = async () => {
    if (!card?.chatwoot_conversa_id) return;

    setIsGeneratingResumo(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-resumo-comercial', {
        body: { conversationId: card.chatwoot_conversa_id }
      });

      if (error) throw error;

      if (data?.resumo) {
        setResumoComercial(data.resumo);
        
        // Salvar resumo no card
        await updateCard.mutateAsync({
          id: card.id,
          updates: { resumo_comercial: data.resumo },
        });
      }
    } catch (error) {
      console.error("Erro ao gerar resumo:", error);
    } finally {
      setIsGeneratingResumo(false);
    }
  };

  const handleMarcarGanho = () => {
    if (!card) return;
    
    updateCard.mutate(
      {
        id: card.id,
        updates: { status: 'ganho' },
      },
      {
        onSuccess: () => {
          toast.success("Venda marcada como ganha! 🎉");
          onOpenChange(false);
        },
      }
    );
  };

  const handleMarcarPerda = (motivoId: string, observacao?: string) => {
    if (!card) return;
    
    updateCard.mutate(
      {
        id: card.id,
        updates: {
          status: 'perdido',
          motivo_perda_id: motivoId,
          descricao_detalhada: observacao
            ? `${card.descricao_detalhada || ''}\n\nMotivo da perda: ${observacao}`.trim()
            : card.descricao_detalhada,
        },
      },
      {
        onSuccess: () => {
          toast.success("Venda marcada como perdida");
          setModalPerdaOpen(false);
          onOpenChange(false);
        },
      }
    );
  };

  const handlePausar = () => {
    if (!card) return;
    
    const novoPausado = !card.pausado;
    
    updateCard.mutate(
      {
        id: card.id,
        updates: {
          pausado: novoPausado,
          status: novoPausado ? 'pausado' : 'em_andamento',
        },
      },
      {
        onSuccess: () => {
          toast.success(novoPausado ? "Negociação pausada" : "Negociação retomada");
        },
      }
    );
  };

  if (!card) return null;

  const chatwootUrl = config?.url && card.chatwoot_conversa_id 
    ? `${config.url}/app/accounts/${config.account_id}/conversations/${card.chatwoot_conversa_id}`
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[95vw] p-0 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="p-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <SheetTitle className="text-2xl font-bold">{card.titulo}</SheetTitle>
              <div className="flex flex-wrap gap-2">
                {card.chatwoot_conversa_id && (
                  <Badge variant="outline" className="text-xs">
                    Conversa #{card.chatwoot_conversa_id}
                  </Badge>
                )}
                {card.funil_nome && (
                  <Badge variant="secondary" className="text-xs">
                    {card.funil_nome}
                  </Badge>
                )}
                {card.funil_etapa && (
                  <Badge className="text-xs">
                    {card.funil_etapa}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button onClick={handleMarcarGanho} variant="default" size="sm" className="bg-success hover:bg-success/90">
                <Trophy className="h-4 w-4 mr-1" />
                Ganhou
              </Button>
              <Button onClick={() => setModalPerdaOpen(true)} variant="destructive" size="sm">
                <X className="h-4 w-4 mr-1" />
                Perdeu
              </Button>
              <Button onClick={handlePausar} variant="secondary" size="sm">
                <Pause className="h-4 w-4 mr-1" />
                {card.pausado ? "Retomar" : "Pausar"}
              </Button>
              <Button onClick={handleSave} disabled={updateCard.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Content - Layout 2 colunas em desktop */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Coluna Principal - 70% */}
          <div className="flex-1 lg:w-[70%] flex flex-col overflow-hidden border-r border-border">
            <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full justify-start rounded-none border-b border-border px-6 shrink-0">
                <TabsTrigger value="chat" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="atividades" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Atividades
                </TabsTrigger>
              </TabsList>

              {/* Tab Chat */}
              <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
                {card.chatwoot_conversa_id ? (
                  <ChatInbox 
                    conversationId={card.chatwoot_conversa_id}
                    cardId={card.id}
                    funilId={card.funil_id}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Nenhuma conversa vinculada</p>
                  </div>
                )}
              </TabsContent>

              {/* Tab Atividades */}
              <TabsContent value="atividades" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-4">
                    {/* Adicionar Nota Rápida */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Adicionar Nota</Label>
                      <div className="flex gap-2">
                        <Textarea
                          value={novaNota}
                          onChange={(e) => setNovaNota(e.target.value)}
                          placeholder="Digite uma nota rápida..."
                          rows={2}
                          className="flex-1"
                        />
                        <Button
                          onClick={handleAdicionarNota}
                          disabled={!novaNota.trim() || createAtividade.isPending}
                          size="sm"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    {/* Timeline de atividades */}
                    {isLoadingAtividades ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Carregando atividades...
                      </div>
                    ) : (
                      <AtividadeTimeline atividades={atividades || []} />
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - 30% */}
          <ScrollArea className="w-full lg:w-[30%] bg-muted/20">
            <div className="p-6 space-y-6">
              {/* Resumo Comercial */}
              {resumoComercial && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Resumo Comercial
                  </h3>
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {resumoComercial}
                    </p>
                  </div>
                </div>
              )}

              {isGeneratingResumo && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    Gerando Resumo...
                  </h3>
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <div className="space-y-2">
                      <div className="h-3 bg-muted animate-pulse rounded" />
                      <div className="h-3 bg-muted animate-pulse rounded w-4/5" />
                      <div className="h-3 bg-muted animate-pulse rounded w-3/5" />
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Informações do Card */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Detalhes do Card
                </h3>

                <div className="space-y-3">
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Título do card"
                    />
                  </div>

                  <div>
                    <Label>Funil</Label>
                    <Select value={funilId} onValueChange={setFunilId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um funil" />
                      </SelectTrigger>
                      <SelectContent>
                        {funis?.map((funil) => (
                          <SelectItem key={funil.id} value={funil.id}>
                            {funil.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Etapa</Label>
                    <Select value={etapaId} onValueChange={setEtapaId} disabled={!funilId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma etapa" />
                      </SelectTrigger>
                      <SelectContent>
                        {etapas?.map((etapa) => (
                          <SelectItem key={etapa.id} value={etapa.id}>
                            {etapa.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Prioridade</Label>
                    <Select value={prioridade} onValueChange={setPrioridade}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>


                  {/* Link para Chatwoot */}
                  {chatwootUrl && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => window.open(chatwootUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir no Chatwoot
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Criar Follow-up */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Criar Follow-up</h3>
                
                <div className="space-y-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={followUpTipo} onValueChange={setFollowUpTipo}>
                      <SelectTrigger>
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

                  <div>
                    <Label>Data de Retorno</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !followUpData && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {followUpData ? format(followUpData, "PPP", { locale: ptBR }) : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={followUpData}
                          onSelect={setFollowUpData}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={followUpDescricao}
                      onChange={(e) => setFollowUpDescricao(e.target.value)}
                      placeholder="Descreva a atividade..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={handleCriarFollowUp}
                    disabled={!followUpDescricao.trim() || createAtividade.isPending}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Follow-up
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Produtos */}
              <CardProdutosManager cardId={card.id} />
            </div>
          </ScrollArea>
        </div>
      </SheetContent>

      {/* Modal de Perda */}
      <ModalMotivoPerda
        open={modalPerdaOpen}
        onOpenChange={setModalPerdaOpen}
        onConfirm={handleMarcarPerda}
      />
    </Sheet>
  );
};