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

interface CardDetailsModalProps {
  card: CardConversa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Card Details em formato Sheet fullscreen (Onda 3)
 * Layout 2 colunas em desktop: Conteúdo principal (70%) + Sidebar (30%)
 * Mobile: Layout single-column com tabs
 */
export const CardDetailsModal = ({ card, open, onOpenChange }: CardDetailsModalProps) => {
  const [titulo, setTitulo] = useState("");
  const [prazo, setPrazo] = useState<Date | undefined>(undefined);
  const [prioridade, setPrioridade] = useState("");
  const [descricaoDetalhada, setDescricaoDetalhada] = useState("");
  const [resumoComercial, setResumoComercial] = useState("");
  const [novaNota, setNovaNota] = useState("");
  const [funilId, setFunilId] = useState<string>("");
  const [etapaId, setEtapaId] = useState<string>("");
  const [isGeneratingResumo, setIsGeneratingResumo] = useState(false);
  const [modalPerdaOpen, setModalPerdaOpen] = useState(false);
  const [dataRetorno, setDataRetorno] = useState<Date | undefined>(
    new Date(Date.now() + 7 * 86400000)
  );
  
  const updateCard = useUpdateCard();
  const { atividades, loading: isLoadingAtividades } = useAtividades(card?.id || null);
  const createAtividade = useCreateAtividade();
  const { data: funis } = useFunis();
  const { data: etapas } = useEtapas(funilId || null);

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
      prazo: prazo ? format(prazo, "yyyy-MM-dd") : null,
      prioridade: prioridade || null,
      descricao_detalhada: descricaoDetalhada || null,
      resumo_comercial: resumoComercial || null,
      funil_id: funilId || null,
      funil_nome: funilNome,
      funil_etapa: funilEtapa,
      etapa_id: etapaId || null,
      data_retorno: dataRetorno ? format(dataRetorno, "yyyy-MM-dd") : null,
    };

    // Detectar se mudou funil ou etapa para sync com Chatwoot
    const changedFunilOrEtapa = 
      (funilNome !== card.funil_nome) || 
      (funilEtapa !== card.funil_etapa);

    updateCard.mutate(
      { id: card.id, updates },
      {
        onSuccess: async () => {
          toast.success("Card atualizado com sucesso!");
          
          // Se mudou funil/etapa E tem conversation_id, sincronizar com Chatwoot
          if (changedFunilOrEtapa && card.chatwoot_conversa_id) {
            try {
              const { syncCardToChatwoot } = await import("@/services/cardSyncService");
              await syncCardToChatwoot({
                conversationId: card.chatwoot_conversa_id,
                label: funilNome || undefined,
                etapaComercial: funilEtapa || undefined,
              });
              console.log('[CardDetailsModal] Sync com Chatwoot realizado');
            } catch (syncError) {
              console.error('[CardDetailsModal] Erro ao sincronizar com Chatwoot:', syncError);
              // Não mostrar erro ao usuário, apenas logar
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

  const handleAddNota = async () => {
    if (!card || !novaNota.trim()) return;

    createAtividade.mutate(
      {
        cardId: card.id,
        tipo: "NOTA",
        descricao: novaNota,
        sendToChatwoot: true,
        conversationId: card.chatwoot_conversa_id || undefined,
      },
      {
        onSuccess: () => {
          setNovaNota("");
          toast.success("Nota adicionada!");
        },
        onError: (error) => {
          console.error("Erro ao adicionar nota:", error);
          toast.error("Erro ao adicionar nota");
        },
      }
    );
  };

  const handleGerarResumo = async () => {
    if (!card?.chatwoot_conversa_id) {
      toast.error("Card não possui conversa vinculada");
      return;
    }

    setIsGeneratingResumo(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('ai-resumo-comercial', {
        body: {
          conversationId: card.chatwoot_conversa_id,
          cardId: card.id,
        },
      });

      if (error) throw error;

      setResumoComercial(data.resumo);
      toast.success("Resumo comercial gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar resumo:", error);
      toast.error(error.message || "Erro ao gerar resumo comercial");
    } finally {
      setIsGeneratingResumo(false);
    }
  };

  const handleMarcarGanho = async () => {
    if (!card || !etapas) return;
    
    const ultimaEtapa = etapas[etapas.length - 1];
    
    updateCard.mutate(
      {
        id: card.id,
        updates: {
          status: 'ganho',
          etapa_id: ultimaEtapa?.id || card.etapa_id,
          funil_etapa: ultimaEtapa?.nome || card.funil_etapa,
        },
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
                  Conversas
                </TabsTrigger>
                <TabsTrigger value="atividades" className="gap-2">
                  <Activity className="h-4 w-4" />
                  Atividades
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
                {card.chatwoot_conversa_id ? (
                  <ChatInbox
                    conversationId={card.chatwoot_conversa_id}
                    cardId={card.id}
                    funilId={card.funil_id}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center space-y-2">
                      <MessageSquare className="h-12 w-12 mx-auto opacity-50" />
                      <p>Nenhuma conversa vinculada a este card</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="atividades" className="flex-1 m-0 overflow-hidden p-6">
                <ScrollArea className="h-full">
                  <div className="space-y-4">
                    {/* Adicionar nova nota */}
                    <div className="space-y-2">
                      <Label>Adicionar Nota</Label>
                      <div className="flex gap-2">
                        <Textarea
                          value={novaNota}
                          onChange={(e) => setNovaNota(e.target.value)}
                          placeholder="Digite uma nota..."
                          className="min-h-[80px]"
                        />
                        <Button
                          onClick={handleAddNota}
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

                  <div>
                    <Label>Prazo</Label>
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
                          {prazo ? format(prazo, "PPP", { locale: ptBR }) : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={prazo}
                          onSelect={setPrazo}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Data de Retorno</Label>
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
                          {dataRetorno
                            ? format(dataRetorno, "PPP", { locale: ptBR })
                            : "Selecione uma data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dataRetorno}
                          onSelect={setDataRetorno}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Descrição Detalhada</Label>
                    <Textarea
                      value={descricaoDetalhada}
                      onChange={(e) => setDescricaoDetalhada(e.target.value)}
                      placeholder="Descrição completa do card"
                      className="min-h-[100px]"
                    />
                  </div>

                  <Separator />

                  {/* Produtos */}
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Produtos</Label>
                    <CardProdutosManager cardId={card.id} />
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Resumo Comercial</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGerarResumo}
                        disabled={isGeneratingResumo || !card.chatwoot_conversa_id}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {isGeneratingResumo ? "Gerando..." : "Gerar com IA"}
                      </Button>
                    </div>
                    <Textarea
                      value={resumoComercial}
                      onChange={(e) => setResumoComercial(e.target.value)}
                      placeholder="Resumo comercial"
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
      
      <ModalMotivoPerda
        open={modalPerdaOpen}
        onOpenChange={setModalPerdaOpen}
        onConfirm={handleMarcarPerda}
      />
    </Sheet>
  );
};
