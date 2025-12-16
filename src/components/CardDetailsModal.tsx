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
import { useSyncCardFromChatwoot } from "@/hooks/useSyncCardFromChatwoot";
import { useAutosave } from "@/hooks/useAutosave";
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
import { RefreshCw } from "lucide-react";

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
  const syncMutation = useSyncCardFromChatwoot();

  useEffect(() => {
    if (card) {
      setTitulo(card.titulo || "");
      setPrioridade(card.prioridade || "");
      setDescricaoDetalhada(card.descricao_detalhada || "");
      setResumoComercial(card.resumo_comercial || "");
      setFunilId(card.funil_id || "");
      setEtapaId(card.etapa_id || "");
    }
  }, [card]);

  // ZERO-CLICK: Gerar resumo automaticamente se não existir
  useEffect(() => {
    if (!card) return;
    if (!card.chatwoot_conversa_id) return;
    if (card.resumo_comercial) return; // Já tem resumo
    if (isGeneratingResumo) return; // Já está gerando
    
    console.log('[CardDetails] Gerando resumo automaticamente...');
    handleGerarResumo();
  }, [card?.id, card?.chatwoot_conversa_id, card?.resumo_comercial]);

  // GRUPO B.2: Autosave expandido para TODOS os campos relevantes
  const { save: autosave, isSaving } = useAutosave({ 
    cardId: card?.id || '', 
    enabled: !!card,
    debounceMs: 500 
  });

  // GRUPO B.3: Sync Chatwoot automático ao abrir (se > 5min desde último sync)
  useEffect(() => {
    if (!card?.chatwoot_conversa_id) return;
    
    const lastSync = card.updated_at ? new Date(card.updated_at).getTime() : 0;
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    if (lastSync < fiveMinutesAgo && !syncMutation.isPending) {
      console.log('[CardDetails] Auto-sync Chatwoot (último sync > 5min)');
      syncMutation.mutate({ cardId: card.id, conversationId: card.chatwoot_conversa_id });
    }
  }, [card?.id]);

  // Autosave para título
  useEffect(() => {
    if (!card || !titulo) return;
    if (titulo.trim() && titulo.trim() !== (card.titulo || '').trim()) {
      autosave({ titulo: titulo.trim() });
    }
  }, [titulo]);

  // Autosave para descrição
  useEffect(() => {
    if (!card) return;
    if (descricaoDetalhada.trim() !== (card.descricao_detalhada || '').trim()) {
      autosave({ descricao_detalhada: descricaoDetalhada.trim() || null });
    }
  }, [descricaoDetalhada]);

  // Autosave para prioridade
  useEffect(() => {
    if (!card) return;
    if (prioridade !== (card.prioridade || '')) {
      autosave({ prioridade: prioridade || null });
    }
  }, [prioridade]);

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
    if (!card || !novaNota.trim()) {
      toast.error("Nota vazia");
      return;
    }

    // Validar conversa Chatwoot
    if (!card.chatwoot_conversa_id) {
      console.warn('⚠️ Card sem conversa Chatwoot vinculada');
      toast.error("Este card não possui conversa do Chatwoot. Nota será criada apenas no CRM.");
    }

    try {
      console.log('🔍 [DEBUG] Adicionando nota:', {
        cardId: card.id,
        conversationId: card.chatwoot_conversa_id,
        notaLength: novaNota.length
      });

      await createAtividade.mutateAsync({
        cardId: card.id,
        tipo: "Nota",
        descricao: novaNota,
        sendToChatwoot: !!card.chatwoot_conversa_id,
        conversationId: card.chatwoot_conversa_id || undefined,
      });

      console.log('✅ [SUCCESS] Nota adicionada');
      setNovaNota("");
      
      toast.success(
        card.chatwoot_conversa_id
          ? "Nota adicionada e enviada ao Chatwoot!"
          : "Nota adicionada no CRM!"
      );
    } catch (error) {
      console.error("❌ [ERROR] Erro ao adicionar nota:", error);
      console.error("  - Tipo:", error?.constructor?.name);
      console.error("  - Mensagem:", error?.message);
      
      toast.error(
        error instanceof Error 
          ? `Erro: ${error.message}` 
          : "Erro ao adicionar nota"
      );
    }
  };

  const handleCriarFollowUp = async () => {
    console.log('🔍 [DEBUG] Follow-up iniciado:', {
      cardId: card?.id,
      conversationId: card?.chatwoot_conversa_id,
      followUpData,
      followUpDescricao: followUpDescricao?.substring(0, 30)
    });
    
    if (!card || !followUpDescricao.trim()) {
      toast.error("Descrição do follow-up é obrigatória");
      return;
    }

    // Validação crítica: verificar se conversa existe
    if (!card.chatwoot_conversa_id) {
      console.warn('⚠️ Card sem conversa Chatwoot vinculada');
      toast.error("Este card não possui conversa do Chatwoot vinculada. Follow-up será criado apenas no CRM.");
    }

    try {
      console.log('🔍 [DEBUG] Chamando createAtividade.mutateAsync...');
      
      await createAtividade.mutateAsync({
        cardId: card.id,
        tipo: followUpTipo,
        descricao: followUpDescricao,
        dataPrevista: followUpData ? followUpData.toISOString() : undefined,
        sendToChatwoot: !!card.chatwoot_conversa_id,
        conversationId: card.chatwoot_conversa_id || undefined,
      });

      console.log('✅ [SUCCESS] Follow-up criado com sucesso');

      // Limpar formulário
      setFollowUpDescricao("");
      setFollowUpTipo("Ligação");
      setFollowUpData(new Date(Date.now() + 7 * 86400000));
      
      toast.success(
        card.chatwoot_conversa_id 
          ? "Follow-up criado e enviado ao Chatwoot!" 
          : "Follow-up criado no CRM!"
      );
    } catch (error) {
      console.error("❌ [ERROR] Erro ao criar follow-up:", error);
      console.error("  - Tipo:", error?.constructor?.name);
      console.error("  - Mensagem:", error?.message);
      
      toast.error(
        error instanceof Error 
          ? `Erro: ${error.message}` 
          : "Erro ao criar follow-up"
      );
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

  // GRUPO A.3: Handlers unificados para status
  const handleGanhou = async () => {
    if (!card) return;
    await updateCard.mutateAsync({ 
      id: card.id, 
      updates: { status: 'ganho', arquivado: true, pausado: false }
    });
    toast.success("Oportunidade marcada como GANHA! 🎉");
    onOpenChange(false);
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

  const handleSyncFromChatwoot = async () => {
    if (!card?.chatwoot_conversa_id) {
      toast.error("Card não possui conversa do Chatwoot vinculada");
      return;
    }

    syncMutation.mutate(
      { cardId: card.id, conversationId: card.chatwoot_conversa_id },
      {
        onSuccess: () => {
          // As atividades serão recarregadas automaticamente pelo hook
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
              {card.chatwoot_conversa_id && (
                <Button
                  onClick={handleSyncFromChatwoot}
                  variant="outline"
                  size="sm"
                  disabled={syncMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  Atualizar do Chatwoot
                </Button>
              )}
              <Button onClick={handleGanhou} variant="default" size="sm" className="bg-success hover:bg-success/90">
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
                    avatarLeadUrl={card.avatar_lead_url}
                    avatarAgenteUrl={card.avatar_agente_url}
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
              {/* RESUMO COMERCIAL IA - TOPO DA SIDEBAR (destacado) */}
              <div className="space-y-3 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg flex items-center gap-2 text-primary">
                    <Sparkles className="h-5 w-5" />
                    Resumo Comercial IA
                  </h3>
                  {card.chatwoot_conversa_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGerarResumo}
                      disabled={isGeneratingResumo}
                      className="text-primary hover:text-primary/80"
                    >
                      <RefreshCw className={`h-4 w-4 ${isGeneratingResumo ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </div>
                
                {isGeneratingResumo ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-primary/20 animate-pulse rounded" />
                    <div className="h-3 bg-primary/20 animate-pulse rounded w-4/5" />
                    <div className="h-3 bg-primary/20 animate-pulse rounded w-3/5" />
                  </div>
                ) : resumoComercial ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {resumoComercial}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Clique no botão para gerar um resumo com IA
                  </p>
                )}
              </div>

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

      {/* GRUPO A.3: Modal de motivo de perda unificado */}
      <ModalMotivoPerda
        open={modalPerdaOpen}
        onOpenChange={setModalPerdaOpen}
        cardId={card?.id || ''}
        funilId={card?.funil_id}
        onConfirm={() => onOpenChange(false)}
      />
    </Sheet>
  );
};