import { supabase } from "@/integrations/supabase/client";
import type { CardConversa } from "@/types/database";

/**
 * Busca um card pelo ID da conversa do Chatwoot
 */
export async function getCardByConversationId(conversationId: number): Promise<CardConversa | null> {
  const { data, error } = await supabase
    .from("cards_conversas")
    .select("*")
    .eq("chatwoot_conversa_id", conversationId)
    .maybeSingle();

  if (error) {
    console.error("[CardLookup] Erro ao buscar card:", error);
    throw error;
  }

  return data as CardConversa | null;
}

/**
 * Cria um novo card para uma conversa do Chatwoot
 */
export async function createCardForConversation(params: {
  conversationId: number;
  titulo: string;
  etapaId: string;
  funilId: string;
  funilNome: string;
  etapaNome: string;
  telefone?: string;
  email?: string;
  avatarUrl?: string;
}): Promise<CardConversa> {
  const { data, error } = await supabase
    .from("cards_conversas")
    .insert({
      chatwoot_conversa_id: params.conversationId,
      titulo: params.titulo,
      etapa_id: params.etapaId,
      funil_id: params.funilId,
      funil_nome: params.funilNome,
      funil_etapa: params.etapaNome,
      telefone_lead: params.telefone,
      avatar_lead_url: params.avatarUrl,
      status: 'em_andamento',
      data_retorno: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    })
    .select()
    .single();

  if (error) {
    console.error("[CardLookup] Erro ao criar card:", error);
    throw error;
  }

  // Criar atividade de criação
  await supabase.from("atividades_cards").insert({
    card_id: data.id,
    tipo: "CRIACAO",
    descricao: "Card criado via integração Chatwoot",
  });

  return data as CardConversa;
}

/**
 * Move um card para uma nova etapa
 */
export async function moveCardToStage(params: {
  cardId: string;
  etapaId: string;
  funilId: string;
  funilNome: string;
  etapaNome: string;
}): Promise<CardConversa> {
  const { data, error } = await supabase
    .from("cards_conversas")
    .update({
      etapa_id: params.etapaId,
      funil_id: params.funilId,
      funil_nome: params.funilNome,
      funil_etapa: params.etapaNome,
    })
    .eq("id", params.cardId)
    .select()
    .single();

  if (error) {
    console.error("[CardLookup] Erro ao mover card:", error);
    throw error;
  }

  // Criar atividade de movimentação
  await supabase.from("atividades_cards").insert({
    card_id: params.cardId,
    tipo: "MUDANCA_ETAPA",
    descricao: `Card movido para ${params.funilNome} → ${params.etapaNome}`,
  });

  return data as CardConversa;
}

/**
 * Cria uma atividade de follow-up
 */
export async function createFollowUpActivity(params: {
  cardId: string;
  tipo: string;
  descricao: string;
  dataPrevista: string;
  userId?: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("atividades_cards")
    .insert({
      card_id: params.cardId,
      tipo: params.tipo,
      descricao: params.descricao,
      data_prevista: params.dataPrevista,
      status: 'pendente',
      user_id: params.userId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[CardLookup] Erro ao criar follow-up:", error);
    throw error;
  }

  // Atualizar data_retorno do card
  await supabase
    .from("cards_conversas")
    .update({ data_retorno: params.dataPrevista })
    .eq("id", params.cardId);

  return data.id;
}
