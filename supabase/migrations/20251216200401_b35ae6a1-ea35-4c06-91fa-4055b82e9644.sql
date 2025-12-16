-- Adicionar coluna etapa_origem_id para fluxo de Clientes Frios
ALTER TABLE public.cards_conversas 
ADD COLUMN IF NOT EXISTS etapa_origem_id UUID REFERENCES public.etapas(id);

-- Comentário explicativo
COMMENT ON COLUMN public.cards_conversas.etapa_origem_id IS 'Armazena a etapa original quando o card é pausado/movido para Clientes Frios';