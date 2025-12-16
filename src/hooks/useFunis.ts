import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Funil, Etapa, CardConversa } from "@/types/database";
import { computarStatusTarefa, type StatusInfo } from "@/services/cardStatusService";

export const useFunis = () => {
  return useQuery<Funil[]>({
    queryKey: ["funis"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("funis")
        .select("*")
        .order("nome");
      
      if (error) throw error;
      return (data || []) as Funil[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useEtapas = (funilId: string | null) => {
  return useQuery<Etapa[]>({
    queryKey: ["etapas", funilId],
    queryFn: async () => {
      if (!funilId) return [];
      
      const { data, error } = await (supabase as any)
        .from("etapas")
        .select("*")
        .eq("funil_id", funilId)
        .order("ordem");
      
      if (error) throw error;
      return (data || []) as Etapa[];
    },
    enabled: !!funilId,
  });
};

export const useCardsConversas = (etapaId: string | null) => {
  return useQuery<CardConversa[]>({
    queryKey: ["cards_conversas", etapaId],
    queryFn: async () => {
      if (!etapaId) return [];
      
      const { data, error } = await (supabase as any)
        .from("cards_conversas")
        .select("*")
        .eq("etapa_id", etapaId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as CardConversa[];
    },
    enabled: !!etapaId,
  });
};

export interface CardWithStatus extends CardConversa {
  statusInfo: StatusInfo;
}

export const useAllCardsForFunil = (
  funilId: string | null, 
  page: number = 0, 
  pageSize: number = 50,
  filters?: {
    status?: string;
    leadName?: string;
    productId?: string | null;
    openedFrom?: string | null;
    openedTo?: string | null;
    etapaId?: string | null;
    assignedTo?: string | null;
    verMeus?: boolean;
  }
) => {
  return useQuery<{ cards: CardWithStatus[]; totalCount: number }>({
    queryKey: ["all_cards", funilId, page, filters],
    queryFn: async () => {
      if (!funilId) return { cards: [], totalCount: 0 };
      
      let query = supabase
        .from("cards_conversas")
        .select('*', { count: 'exact' })
        .eq('funil_id', funilId)
        .eq('arquivado', false);
      
      // Filtro de status da oportunidade
      if (filters?.status && filters.status !== 'todos') {
        if (filters.status === 'ativo') {
          query = query.eq('status', 'em_andamento').eq('pausado', false);
        } else if (filters.status === 'pausado') {
          query = query.eq('pausado', true);
        } else if (filters.status === 'perdido') {
          query = query.eq('status', 'perdido');
        } else if (filters.status === 'ganho') {
          query = query.eq('status', 'ganho');
        }
      }
      
      // Filtro de nome do lead
      if (filters?.leadName) {
        query = query.ilike('titulo', `%${filters.leadName}%`);
      }
      
      // Filtro por etapa
      if (filters?.etapaId) {
        query = query.eq('etapa_id', filters.etapaId);
      }
      
      // RBAC: "Ver Meus" - Filtrar apenas cards do usuário logado
      if (filters?.verMeus) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          query = query.eq('assigned_to', user.id);
        }
      } else if (filters?.assignedTo) {
        // Filtro específico por responsável (para admins)
        query = query.eq('assigned_to', filters.assignedTo);
      }
      
      // Filtro de data de abertura
      if (filters?.openedFrom) {
        query = query.gte('created_at', filters.openedFrom);
      }
      if (filters?.openedTo) {
        query = query.lte('created_at', filters.openedTo);
      }
      
      // Paginação
      const start = page * pageSize;
      const end = start + pageSize - 1;
      query = query.range(start, end).order("created_at", { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      const cardsComStatus = (data || []).map((card: any) => ({
        ...card,
        statusInfo: computarStatusTarefa(card.data_retorno)
      } as CardWithStatus));

      return {
        cards: cardsComStatus,
        totalCount: count || 0
      };
    },
    enabled: !!funilId,
    refetchInterval: 10000,
    staleTime: 5000,
  });
};

/**
 * Hook para disparar webhooks externos quando card muda de etapa
 */
async function dispatchAutomationWebhooks(
  cardId: string,
  oldEtapaId: string | null,
  newEtapaId: string,
  cardData: any
) {
  try {
    // Buscar webhooks configurados para esta mudança de etapa
    const { data: webhooks, error } = await supabase
      .from('webhook_config')
      .select('*')
      .eq('ativo', true)
      .or(`etapa_origem.eq.${oldEtapaId},etapa_destino.eq.${newEtapaId}`);

    if (error || !webhooks || webhooks.length === 0) return;

    for (const webhook of webhooks) {
      // Verificar se matches os critérios
      const matchOrigem = webhook.etapa_origem === oldEtapaId;
      const matchDestino = webhook.etapa_destino === newEtapaId;
      
      // Se configurou ambos, ambos devem dar match. Se apenas um, basta aquele.
      const shouldDispatch = 
        (webhook.etapa_origem && webhook.etapa_destino) 
          ? (matchOrigem && matchDestino)
          : (matchOrigem || matchDestino);

      if (!shouldDispatch || !webhook.url_externa) continue;

      // Montar payload
      const payload = {
        event: 'card_moved',
        card_id: cardId,
        titulo: cardData.titulo,
        etapa_anterior_id: oldEtapaId,
        etapa_nova_id: newEtapaId,
        funil_id: cardData.funil_id,
        funil_nome: cardData.funil_nome,
        etapa_nome: cardData.funil_etapa,
        chatwoot_conversa_id: cardData.chatwoot_conversa_id,
        telefone_lead: cardData.telefone_lead,
        timestamp: new Date().toISOString(),
      };

      // Montar headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (webhook.headers_customizados) {
        Object.assign(headers, webhook.headers_customizados);
      }

      // Disparar webhook (fire & forget)
      fetch(webhook.url_externa, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }).then(res => {
        console.log(`[Automation] Webhook ${webhook.nome} disparado: ${res.status}`);
      }).catch(err => {
        console.warn(`[Automation] Falha ao disparar webhook ${webhook.nome}:`, err);
      });
    }
  } catch (err) {
    console.warn('[Automation] Erro ao verificar webhooks:', err);
  }
}

export const useMoveCard = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      cardId, 
      newEtapaId,
      oldEtapaNome,
      newEtapaNome 
    }: { 
      cardId: string; 
      newEtapaId: string;
      oldEtapaNome?: string;
      newEtapaNome?: string;
    }) => {
      // Buscar etapa atual antes de atualizar
      const { data: currentCard } = await supabase
        .from("cards_conversas")
        .select("etapa_id, funil_id, funil_nome, titulo, chatwoot_conversa_id, telefone_lead")
        .eq("id", cardId)
        .single();

      const oldEtapaId = currentCard?.etapa_id || null;

      // Atualizar etapa do card
      const { data: card, error: updateError } = await (supabase as any)
        .from("cards_conversas")
        .update({ 
          etapa_id: newEtapaId,
          funil_etapa: newEtapaNome
        })
        .eq("id", cardId)
        .select()
        .single();
      
      if (updateError) throw updateError;

      // Criar registro de atividade
      const descricao = oldEtapaNome && newEtapaNome 
        ? `Card movido de "${oldEtapaNome}" para "${newEtapaNome}"`
        : "Card movido para outra etapa";

      const { error: atividadeError } = await (supabase as any)
        .from("atividades_cards")
        .insert({
          card_id: cardId,
          tipo: "MUDANCA_ETAPA",
          descricao,
        });
      
      if (atividadeError) console.error("Erro ao criar atividade:", atividadeError);

      // Sync bidirecional com Chatwoot (silent fail)
      if (card.chatwoot_conversa_id && newEtapaNome) {
        try {
          await supabase.functions.invoke('sync-chatwoot', {
            body: {
              conversation_id: card.chatwoot_conversa_id,
              funil_etapa: newEtapaNome,
              data_retorno: card.data_retorno,
            }
          });
          console.log(`[Sync Bidir] Chatwoot atualizado: conv ${card.chatwoot_conversa_id} → etapa "${newEtapaNome}"`);
        } catch (syncError) {
          console.warn('[Sync Bidir] Falha ao sincronizar com Chatwoot (não crítico):', syncError);
        }
      }

      // AUTOMAÇÃO: Disparar webhooks externos configurados
      dispatchAutomationWebhooks(cardId, oldEtapaId, newEtapaId, {
        ...card,
        funil_etapa: newEtapaNome,
      });
      
      return card;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_cards"] });
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      toast.success("Card movido com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao mover card:", error);
      toast.error("Erro ao mover card. Tente novamente.");
    },
  });
};

export const useUpdateCard = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await (supabase as any)
        .from("cards_conversas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;

      // Sync bidirecional com Chatwoot
      if (data.chatwoot_conversa_id && (updates.data_retorno || updates.funil_etapa)) {
        try {
          const syncPayload: any = {
            conversation_id: data.chatwoot_conversa_id,
          };

          if (updates.data_retorno) syncPayload.data_retorno = updates.data_retorno;
          if (updates.funil_etapa) syncPayload.funil_etapa = updates.funil_etapa;

          await supabase.functions.invoke('sync-chatwoot', { body: syncPayload });
          console.log(`[Sync Bidir] Chatwoot atualizado via useUpdateCard: conv ${data.chatwoot_conversa_id}`);
        } catch (syncError) {
          console.warn('[Sync Bidir] Falha ao sincronizar com Chatwoot (não crítico):', syncError);
        }
      }

      return data as CardConversa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_cards"] });
      queryClient.invalidateQueries({ queryKey: ["cards_conversas"] });
      toast.success("Card atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar card:", error);
      toast.error("Erro ao atualizar card. Tente novamente.");
    },
  });
};

export const useCreateCard = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      titulo, 
      etapa_id, 
      resumo, 
      prazo, 
      prioridade,
      funil_id,
      funil_nome,
      funil_etapa,
      data_retorno,
    }: { 
      titulo: string; 
      etapa_id: string; 
      resumo?: string | null;
      prazo?: string | null;
      prioridade?: string | null;
      funil_id?: string | null;
      funil_nome?: string | null;
      funil_etapa?: string | null;
      data_retorno?: string | null;
    }) => {
      const { data: card, error: insertError } = await (supabase as any)
        .from("cards_conversas")
        .insert({
          titulo,
          etapa_id,
          resumo,
          prazo,
          prioridade,
          funil_id,
          funil_nome,
          funil_etapa,
          data_retorno: data_retorno || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        })
        .select()
        .single();
      
      if (insertError) throw insertError;

      const { error: atividadeError } = await (supabase as any)
        .from("atividades_cards")
        .insert({
          card_id: card.id,
          tipo: "CRIACAO",
          descricao: "Card criado manualmente",
        });
      
      if (atividadeError) console.error("Erro ao criar atividade:", atividadeError);
      
      return card as CardConversa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_cards"] });
      queryClient.invalidateQueries({ queryKey: ["cards_conversas"] });
      queryClient.invalidateQueries({ queryKey: ["atividades"] });
      toast.success("Card criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar card:", error);
      toast.error("Erro ao criar card. Tente novamente.");
    },
  });
};

export const useCreateFunil = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ nome }: { nome: string }) => {
      const { data, error } = await supabase
        .from("funis")
        .insert({ nome })
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar funil:', error);
        throw new Error(error.message || 'Erro ao criar funil');
      }
      
      return data as Funil;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funis"] });
      toast.success("Funil criado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao criar funil:", error);
      const message = error?.message || "Erro ao criar funil";
      toast.error(message);
    },
  });
};

export const useUpdateFunil = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { data, error } = await (supabase as any)
        .from("funis")
        .update({ nome })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Funil;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funis"] });
      toast.success("Funil atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar funil:", error);
      toast.error("Erro ao atualizar funil. Tente novamente.");
    },
  });
};

export const useDeleteFunil = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (funilId: string) => {
      const { data: cards, error: cardsError } = await (supabase as any)
        .from("cards_conversas")
        .select("id, etapas!inner(funil_id)")
        .eq("etapas.funil_id", funilId);
      
      if (cardsError) throw cardsError;
      
      if (cards && cards.length > 0) {
        throw new Error("Não é possível deletar um funil com cards associados");
      }

      const { error: etapasError } = await (supabase as any)
        .from("etapas")
        .delete()
        .eq("funil_id", funilId);
      
      if (etapasError) throw etapasError;

      const { error: funilError } = await (supabase as any)
        .from("funis")
        .delete()
        .eq("id", funilId);
      
      if (funilError) throw funilError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funis"] });
      queryClient.invalidateQueries({ queryKey: ["etapas"] });
      toast.success("Funil deletado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar funil:", error);
      if (error.message.includes("cards associados")) {
        toast.error("Não é possível deletar um funil com cards associados");
      } else {
        toast.error("Erro ao deletar funil. Tente novamente.");
      }
    },
  });
};

export const useCreateEtapa = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ funilId, nome, ordem }: { funilId: string; nome: string; ordem: number }) => {
      const { data, error } = await (supabase as any)
        .from("etapas")
        .insert({ 
          funil_id: funilId,
          nome,
          ordem 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Etapa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas"] });
      toast.success("Etapa criada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar etapa:", error);
      toast.error("Erro ao criar etapa. Tente novamente.");
    },
  });
};

export const useUpdateEtapa = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { data, error } = await (supabase as any)
        .from("etapas")
        .update({ nome })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Etapa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas"] });
      toast.success("Etapa atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar etapa:", error);
      toast.error("Erro ao atualizar etapa. Tente novamente.");
    },
  });
};

export const useDeleteEtapa = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (etapaId: string) => {
      const { data: cards, error: cardsError } = await (supabase as any)
        .from("cards_conversas")
        .select("id")
        .eq("etapa_id", etapaId);
      
      if (cardsError) throw cardsError;
      
      if (cards && cards.length > 0) {
        throw new Error("Não é possível deletar uma etapa com cards associados");
      }

      const { error } = await (supabase as any)
        .from("etapas")
        .delete()
        .eq("id", etapaId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas"] });
      toast.success("Etapa deletada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar etapa:", error);
      if (error.message.includes("cards associados")) {
        toast.error("Não é possível deletar uma etapa com cards associados");
      } else {
        toast.error("Erro ao deletar etapa. Tente novamente.");
      }
    },
  });
};

export const useReorderEtapas = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (etapas: { id: string; ordem: number }[]) => {
      const updates = etapas.map(({ id, ordem }) =>
        (supabase as any)
          .from("etapas")
          .update({ ordem })
          .eq("id", id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas"] });
      toast.success("Ordem das etapas atualizada!");
    },
    onError: (error) => {
      console.error("Erro ao reordenar etapas:", error);
      toast.error("Erro ao reordenar etapas. Tente novamente.");
    },
  });
};
