-- ============================================
-- MIGRAÇÃO: Sistema de Automação Avançada
-- ============================================

-- Adicionar colunas de automação à tabela webhook_config
ALTER TABLE public.webhook_config 
ADD COLUMN IF NOT EXISTS funil_id UUID REFERENCES public.funis(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS etapa_origem UUID REFERENCES public.etapas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS etapa_destino UUID REFERENCES public.etapas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS url_externa TEXT,
ADD COLUMN IF NOT EXISTS headers_customizados JSONB DEFAULT '{}';

-- Comentários para documentação
COMMENT ON COLUMN public.webhook_config.funil_id IS 'Funil associado para automação';
COMMENT ON COLUMN public.webhook_config.etapa_origem IS 'Etapa de origem que dispara a automação';
COMMENT ON COLUMN public.webhook_config.etapa_destino IS 'Etapa de destino que dispara a automação';
COMMENT ON COLUMN public.webhook_config.url_externa IS 'URL do webhook externo (N8n, Zapier, etc)';
COMMENT ON COLUMN public.webhook_config.headers_customizados IS 'Headers customizados para o webhook externo (Authorization, etc)';

-- Criar índice para busca rápida por funil/etapa
CREATE INDEX IF NOT EXISTS idx_webhook_config_funil ON public.webhook_config(funil_id) WHERE funil_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_config_etapa_origem ON public.webhook_config(etapa_origem) WHERE etapa_origem IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_config_etapa_destino ON public.webhook_config(etapa_destino) WHERE etapa_destino IS NOT NULL;

-- ============================================
-- TABELA: api_keys (para autenticação de API)
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['read']::TEXT[],
  active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Apenas admins/masters podem gerenciar API keys
CREATE POLICY "Admins podem gerenciar api_keys"
ON public.api_keys
FOR ALL
USING (
  (auth.jwt() ->> 'email') = 'jmacedoneto1989@gmail.com'
  OR get_user_role((auth.jwt() ->> 'email'::text)) = 'master'
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (auth.jwt() ->> 'email') = 'jmacedoneto1989@gmail.com'
  OR get_user_role((auth.jwt() ->> 'email'::text)) = 'master'
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Usuários podem ver suas próprias API keys
CREATE POLICY "Usuários podem ver suas api_keys"
ON public.api_keys
FOR SELECT
USING (user_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();