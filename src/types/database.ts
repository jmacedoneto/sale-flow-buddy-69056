/**
 * Tipos auxiliares para contornar problema com types.ts auto-gerado.
 * Remove quando types.ts for regenerado corretamente.
 */

export interface CardConversa {
  id: string;
  funil_id?: string;
  funil_nome?: string;
  funil_etapa?: string;
  data_retorno?: string | null;
  chatwoot_conversa_id?: number | null;
  titulo?: string;
  resumo?: string;
  created_at?: string;
  updated_at?: string;
  prazo?: string | null;
  prioridade?: string | null;
  descricao_detalhada?: string | null;
  resumo_comercial?: string | null;
  etapa_id?: string;
  etapa_origem_id?: string | null;
  status?: string;
  pausado?: boolean;
  motivo_perda_id?: string | null;
  valor_total?: number;
  telefone_lead?: string | null;
  assigned_to?: string | null;
  avatar_lead_url?: string | null;
  avatar_agente_url?: string | null;
  lead_score?: number | null;
  lead_score_categoria?: string | null;
}

export interface Funil {
  id: string;
  nome: string;
  created_at?: string;
  updated_at?: string;
}

export interface Etapa {
  id: string;
  funil_id: string;
  nome: string;
  ordem: number;
  cor?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AtividadeCard {
  id: string;
  card_id: string;
  tipo: string;
  descricao: string;
  data_criacao: string;
  user_id?: string;
  status: string;
  observacao?: string;
  data_prevista?: string;
  data_conclusao?: string;
}

export interface IntegracaoChatwoot {
  id: string;
  url: string;
  api_key: string;
  account_id: number;
  label: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface WebhookConfig {
  id: string;
  nome: string;
  evento_chatwoot: string;
  acao: string;
  ativo: boolean;
  config_adicional?: any;
  created_at?: string;
  updated_at?: string;
}
