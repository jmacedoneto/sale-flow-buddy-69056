import { supabase } from "@/integrations/supabase/client";

export interface CardProduto {
  id: string;
  card_id: string;
  produto_id: string;
  valor: number;
  quantidade: number;
  created_at: string;
  produtos?: {
    id: string;
    nome: string;
    valor_padrao: number;
  };
}

export const listarProdutosCard = async (cardId: string): Promise<CardProduto[]> => {
  const { data, error } = await supabase
    .from('card_produtos')
    .select('*, produtos(*)')
    .eq('card_id', cardId);

  if (error) throw error;
  return data || [];
};

export const adicionarProdutoCard = async (
  cardId: string,
  produtoId: string,
  valor: number,
  quantidade: number = 1
): Promise<CardProduto> => {
  const { data, error } = await supabase
    .from('card_produtos')
    .insert({ card_id: cardId, produto_id: produtoId, valor, quantidade })
    .select('*, produtos(*)')
    .single();

  if (error) throw error;
  return data;
};

export const atualizarProdutoCard = async (
  id: string,
  updates: { valor?: number; quantidade?: number }
): Promise<CardProduto> => {
  const { data, error } = await supabase
    .from('card_produtos')
    .update(updates)
    .eq('id', id)
    .select('*, produtos(*)')
    .single();

  if (error) throw error;
  return data;
};

export const removerProdutoCard = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('card_produtos')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
