import { supabase } from "@/integrations/supabase/client";

export interface MotivoPerda {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const listarMotivosPerda = async (apenasAtivos = true): Promise<MotivoPerda[]> => {
  let query = supabase
    .from('motivos_perda')
    .select('*')
    .order('nome');

  if (apenasAtivos) {
    query = query.eq('ativo', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const criarMotivoPerda = async (motivo: Omit<MotivoPerda, 'id' | 'created_at' | 'updated_at'>): Promise<MotivoPerda> => {
  const { data, error } = await supabase
    .from('motivos_perda')
    .insert(motivo)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const atualizarMotivoPerda = async (id: string, updates: Partial<MotivoPerda>): Promise<MotivoPerda> => {
  const { data, error } = await supabase
    .from('motivos_perda')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deletarMotivoPerda = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('motivos_perda')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
