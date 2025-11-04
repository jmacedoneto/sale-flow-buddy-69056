import { supabase } from "@/integrations/supabase/client";

export interface MappingConfig {
  id: string;
  chatwoot_type: 'label' | 'attr';
  chatwoot_key: string;
  chatwoot_value: string | null;
  lovable_funil: string | null;
  lovable_etapa: string | null;
  ordem: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MappingInput {
  chatwoot_type: 'label' | 'attr';
  chatwoot_key: string;
  chatwoot_value?: string | null;
  lovable_funil?: string | null;
  lovable_etapa?: string | null;
  ordem?: number;
  active?: boolean;
}

/**
 * Lista todos os mappings
 */
export const listMappings = async (): Promise<MappingConfig[]> => {
  const { data, error } = await supabase
    .from('mappings_config')
    .select('*')
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return (data || []) as MappingConfig[];
};

/**
 * Cria um novo mapping
 */
export const createMapping = async (mapping: MappingInput): Promise<MappingConfig> => {
  const { data, error } = await supabase
    .from('mappings_config')
    .insert(mapping)
    .select()
    .single();
  
  if (error) throw error;
  return data as MappingConfig;
};

/**
 * Atualiza um mapping existente
 */
export const updateMapping = async (
  id: string,
  updates: Partial<MappingInput>
): Promise<MappingConfig> => {
  const { data, error } = await supabase
    .from('mappings_config')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as MappingConfig;
};

/**
 * Deleta um mapping
 */
export const deleteMapping = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('mappings_config')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

/**
 * Busca funis disponíveis
 */
export const getFunis = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('funis')
    .select('nome')
    .order('nome');
  
  if (error) throw error;
  return data?.map(f => f.nome) || [];
};

/**
 * Busca etapas disponíveis (todas ou de um funil específico)
 */
export const getEtapas = async (funilNome?: string): Promise<string[]> => {
  let query = supabase
    .from('etapas')
    .select('nome, funil_id, funis!inner(nome)')
    .order('ordem');

  if (funilNome) {
    query = query.eq('funis.nome', funilNome);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data?.map(e => e.nome) || [];
};
