import { supabase } from "@/integrations/supabase/client";

export interface Produto {
  id: string;
  nome: string;
  valor_padrao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const listarProdutos = async (apenasAtivos = true): Promise<Produto[]> => {
  let query = supabase
    .from('produtos')
    .select('*')
    .order('nome');

  if (apenasAtivos) {
    query = query.eq('ativo', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const criarProduto = async (produto: Omit<Produto, 'id' | 'created_at' | 'updated_at'>): Promise<Produto> => {
  const { data, error } = await supabase
    .from('produtos')
    .insert(produto)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const atualizarProduto = async (id: string, updates: Partial<Produto>): Promise<Produto> => {
  const { data, error } = await supabase
    .from('produtos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deletarProduto = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
