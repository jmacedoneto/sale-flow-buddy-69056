-- Tabela de configuração de automações
CREATE TABLE public.automacoes_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL, -- 'etapa_change', 'funil_change', 'lead_score', 'tarefa_auto'
  gatilho JSONB NOT NULL, -- { evento: 'card_movido', funil_origem: 'X', etapa_destino: 'Y' }
  acao JSONB NOT NULL, -- { tipo: 'mover_funil', funil_destino: 'Comercial', etapa_destino: 'Contato Inicial' }
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para automacoes_config
ALTER TABLE public.automacoes_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar automacoes" 
ON public.automacoes_config 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Todos podem ler automacoes ativas" 
ON public.automacoes_config 
FOR SELECT 
USING ((ativo = true) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_automacoes_updated_at
BEFORE UPDATE ON public.automacoes_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- AUTOMAÇÃO: Volta a Negociação → Comercial/Contato Inicial
CREATE OR REPLACE FUNCTION public.trigger_volta_negociacao()
RETURNS TRIGGER AS $$
BEGIN
  -- Se moveu para "Volta a Negociação" (bea2e58b-1e9b-4208-9cdc-60b0f510e865) 
  -- no funil "Clientes Frios" (8ccd3f79-38a7-430d-aab5-01e1972458c7)
  IF NEW.etapa_id = 'bea2e58b-1e9b-4208-9cdc-60b0f510e865' 
     AND NEW.funil_id = '8ccd3f79-38a7-430d-aab5-01e1972458c7' THEN
    -- Mover para Comercial/Contato Inicial
    NEW.funil_id := '0e9000e5-9ee0-451c-9539-36af95f8080f';
    NEW.etapa_id := '111422f2-760c-4128-ab3a-97465dad67f3';
    NEW.funil_nome := 'Comercial';
    NEW.funil_etapa := 'Contato Inicial';
    NEW.etapa_origem_id := 'bea2e58b-1e9b-4208-9cdc-60b0f510e865';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger BEFORE UPDATE para interceptar mudanças de etapa
CREATE TRIGGER on_card_volta_negociacao
BEFORE UPDATE ON public.cards_conversas
FOR EACH ROW
WHEN (OLD.etapa_id IS DISTINCT FROM NEW.etapa_id)
EXECUTE FUNCTION public.trigger_volta_negociacao();

-- Inserir automações pré-definidas
INSERT INTO public.automacoes_config (nome, descricao, tipo, gatilho, acao, ativo) VALUES
('Volta a Negociação → Comercial', 
 'Move cards do funil Clientes Frios para Comercial quando chegam na etapa Volta a Negociação',
 'etapa_change',
 '{"evento": "card_movido", "funil_origem": "8ccd3f79-38a7-430d-aab5-01e1972458c7", "etapa_destino": "bea2e58b-1e9b-4208-9cdc-60b0f510e865"}',
 '{"tipo": "mover_funil", "funil_destino": "0e9000e5-9ee0-451c-9539-36af95f8080f", "etapa_destino": "111422f2-760c-4128-ab3a-97465dad67f3"}',
 true),
 
('Criar tarefa para novas conversas',
 'Cria automaticamente uma tarefa de retorno para novos cards',
 'tarefa_auto',
 '{"evento": "card_criado"}',
 '{"tipo": "criar_tarefa", "dias_prazo": 1, "tipo_tarefa": "Retorno"}',
 false),

('Atualizar Lead Score via IA',
 'Recalcula o lead score automaticamente quando há nova mensagem',
 'lead_score',
 '{"evento": "message_created"}',
 '{"tipo": "recalcular_score"}',
 true);