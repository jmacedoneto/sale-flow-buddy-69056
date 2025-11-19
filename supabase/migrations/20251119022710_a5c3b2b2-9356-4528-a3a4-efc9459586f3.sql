-- Adicionar coluna de controle de sincronização com Chatwoot
ALTER TABLE public.cards_conversas
ADD COLUMN IF NOT EXISTS last_chatwoot_sync_at TIMESTAMPTZ;

-- Índice para otimizar queries de sync
CREATE INDEX IF NOT EXISTS idx_cards_last_sync
ON public.cards_conversas(last_chatwoot_sync_at);

-- Comentário explicativo
COMMENT ON COLUMN public.cards_conversas.last_chatwoot_sync_at IS 'Timestamp da última sincronização bem-sucedida com o Chatwoot';