-- Tabela para monitorar status de serviços externos
CREATE TABLE IF NOT EXISTS public.system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('operational', 'degraded', 'offline')),
  last_checked TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_message TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para system_health
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

-- Todos podem ler status dos serviços
CREATE POLICY "Todos podem ler system_health"
  ON public.system_health
  FOR SELECT
  USING (true);

-- Service role pode inserir/atualizar (via edge functions)
CREATE POLICY "Service role pode gerenciar system_health"
  ON public.system_health
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_system_health_updated_at
  BEFORE UPDATE ON public.system_health
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir registro inicial para Chatwoot
INSERT INTO public.system_health (service, status, last_checked)
VALUES ('chatwoot', 'operational', now())
ON CONFLICT (service) DO NOTHING;

-- Habilitar realtime para system_health
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_health;