-- Tabela para logs de sincronização de webhooks
CREATE TABLE public.webhook_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL, -- 'chatwoot_to_lovable' ou 'lovable_to_chatwoot'
  conversation_id INTEGER,
  card_id UUID REFERENCES public.cards_conversas(id) ON DELETE SET NULL,
  status TEXT NOT NULL, -- 'success', 'error', 'warning'
  event_type TEXT, -- 'conversation_updated', 'message_created', 'card_moved', etc
  payload JSONB,
  error_message TEXT,
  latency_ms INTEGER, -- tempo de processamento em ms
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_sync_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_status ON public.webhook_sync_logs(status);
CREATE INDEX idx_webhook_logs_sync_type ON public.webhook_sync_logs(sync_type);
CREATE INDEX idx_webhook_logs_conversation_id ON public.webhook_sync_logs(conversation_id);

-- RLS: Super admin pode ver todos os logs
CREATE POLICY "Super admin can view all webhook logs"
ON public.webhook_sync_logs
FOR SELECT
TO public
USING (
  (auth.jwt()->>'email' = 'jmacedoneto1989@gmail.com') OR
  (auth.jwt()->>'role' = 'super-admin') OR
  (auth.jwt()->>'role' = 'super_admin')
);

-- Enable RLS
ALTER TABLE public.webhook_sync_logs ENABLE ROW LEVEL SECURITY;