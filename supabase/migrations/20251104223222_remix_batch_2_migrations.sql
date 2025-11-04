
-- Migration: 20251104212226

-- Migration: 20251104202637

-- Migration: 20251104194205

-- Migration: 20251104182246

-- Migration: 20251104172719

-- Migration: 20251021094252
-- Tabela de funis
CREATE TABLE public.funis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Tabela de etapas (vinculadas aos funis)
CREATE TABLE public.etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funil_id UUID NOT NULL REFERENCES public.funis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(funil_id, ordem)
);

-- Tabela de cards de conversas (vinculados às etapas)
CREATE TABLE public.cards_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id UUID NOT NULL REFERENCES public.etapas(id) ON DELETE CASCADE,
  chatwoot_conversa_id INTEGER,
  titulo TEXT NOT NULL,
  resumo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.funis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards_conversas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS públicas (você pode ajustar depois conforme necessário)
CREATE POLICY "Permitir leitura pública de funis"
  ON public.funis FOR SELECT
  USING (true);

CREATE POLICY "Permitir leitura pública de etapas"
  ON public.etapas FOR SELECT
  USING (true);

CREATE POLICY "Permitir leitura pública de cards"
  ON public.cards_conversas FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção pública de funis"
  ON public.funis FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir inserção pública de etapas"
  ON public.etapas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir inserção pública de cards"
  ON public.cards_conversas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de funis"
  ON public.funis FOR UPDATE
  USING (true);

CREATE POLICY "Permitir atualização pública de etapas"
  ON public.etapas FOR UPDATE
  USING (true);

CREATE POLICY "Permitir atualização pública de cards"
  ON public.cards_conversas FOR UPDATE
  USING (true);

CREATE POLICY "Permitir exclusão pública de funis"
  ON public.funis FOR DELETE
  USING (true);

CREATE POLICY "Permitir exclusão pública de etapas"
  ON public.etapas FOR DELETE
  USING (true);

CREATE POLICY "Permitir exclusão pública de cards"
  ON public.cards_conversas FOR DELETE
  USING (true);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_funis_updated_at
  BEFORE UPDATE ON public.funis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_etapas_updated_at
  BEFORE UPDATE ON public.etapas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cards_conversas_updated_at
  BEFORE UPDATE ON public.cards_conversas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados de exemplo
INSERT INTO public.funis (nome) VALUES 
  ('Vendas Corporativas'),
  ('Atendimento');

-- Inserir etapas para o funil de Vendas Corporativas
INSERT INTO public.etapas (funil_id, nome, ordem) 
SELECT id, 'Prospecção', 1 FROM public.funis WHERE nome = 'Vendas Corporativas'
UNION ALL
SELECT id, 'Qualificação', 2 FROM public.funis WHERE nome = 'Vendas Corporativas'
UNION ALL
SELECT id, 'Proposta', 3 FROM public.funis WHERE nome = 'Vendas Corporativas'
UNION ALL
SELECT id, 'Negociação', 4 FROM public.funis WHERE nome = 'Vendas Corporativas';

-- Inserir etapas para o funil de Atendimento
INSERT INTO public.etapas (funil_id, nome, ordem)
SELECT id, 'Primeiro Contato', 1 FROM public.funis WHERE nome = 'Atendimento'
UNION ALL
SELECT id, 'Em Análise', 2 FROM public.funis WHERE nome = 'Atendimento'
UNION ALL
SELECT id, 'Aguardando Cliente', 3 FROM public.funis WHERE nome = 'Atendimento';

-- Migration: 20251023234507
-- Adicionar novos campos comerciais à tabela cards_conversas
ALTER TABLE public.cards_conversas
ADD COLUMN resumo_comercial TEXT,
ADD COLUMN prazo DATE,
ADD COLUMN prioridade TEXT,
ADD COLUMN descricao_detalhada TEXT;

-- Criar tabela de atividades para histórico
CREATE TABLE public.atividades_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.cards_conversas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_atividades_cards_card_id ON public.atividades_cards(card_id);
CREATE INDEX idx_atividades_cards_data_criacao ON public.atividades_cards(data_criacao DESC);

-- Habilitar RLS na nova tabela
ALTER TABLE public.atividades_cards ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para atividades_cards (acesso público para permitir operações)
CREATE POLICY "Permitir leitura pública de atividades"
ON public.atividades_cards
FOR SELECT
USING (true);

CREATE POLICY "Permitir inserção pública de atividades"
ON public.atividades_cards
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de atividades"
ON public.atividades_cards
FOR UPDATE
USING (true);

CREATE POLICY "Permitir exclusão pública de atividades"
ON public.atividades_cards
FOR DELETE
USING (true);

-- Trigger para atualizar updated_at em cards_conversas quando atividades são adicionadas
CREATE OR REPLACE FUNCTION public.update_card_on_atividade()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.cards_conversas
  SET updated_at = now()
  WHERE id = NEW.card_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_card_on_atividade
AFTER INSERT ON public.atividades_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_card_on_atividade();

-- Migration: 20251103141235
-- Tabela de configuração do Chatwoot
CREATE TABLE IF NOT EXISTS public.integracao_chatwoot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  account_id INTEGER NOT NULL,
  api_key TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'KANBAN_CRM',
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configuração de webhooks
CREATE TABLE IF NOT EXISTS public.webhook_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  evento_chatwoot TEXT NOT NULL,
  acao TEXT NOT NULL,
  config_adicional JSONB,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integracao_chatwoot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para integracao_chatwoot
CREATE POLICY "Permitir leitura pública de configuração Chatwoot"
ON public.integracao_chatwoot FOR SELECT USING (true);

CREATE POLICY "Permitir inserção pública de configuração Chatwoot"
ON public.integracao_chatwoot FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de configuração Chatwoot"
ON public.integracao_chatwoot FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão pública de configuração Chatwoot"
ON public.integracao_chatwoot FOR DELETE USING (true);

-- Políticas RLS para webhook_config
CREATE POLICY "Permitir leitura pública de webhooks"
ON public.webhook_config FOR SELECT USING (true);

CREATE POLICY "Permitir inserção pública de webhooks"
ON public.webhook_config FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de webhooks"
ON public.webhook_config FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão pública de webhooks"
ON public.webhook_config FOR DELETE USING (true);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_integracao_chatwoot_updated_at
BEFORE UPDATE ON public.integracao_chatwoot
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhook_config_updated_at
BEFORE UPDATE ON public.webhook_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251103141325
-- Tabela de configuração do Chatwoot
CREATE TABLE IF NOT EXISTS public.integracao_chatwoot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  account_id INTEGER NOT NULL,
  api_key TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'KANBAN_CRM',
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de configuração de webhooks
CREATE TABLE IF NOT EXISTS public.webhook_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  evento_chatwoot TEXT NOT NULL,
  acao TEXT NOT NULL,
  config_adicional JSONB,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.integracao_chatwoot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para integracao_chatwoot (com DROP IF EXISTS)
DROP POLICY IF EXISTS "Permitir leitura pública de configuração Chatwoot" ON public.integracao_chatwoot;
CREATE POLICY "Permitir leitura pública de configuração Chatwoot"
ON public.integracao_chatwoot FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção pública de configuração Chatwoot" ON public.integracao_chatwoot;
CREATE POLICY "Permitir inserção pública de configuração Chatwoot"
ON public.integracao_chatwoot FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização pública de configuração Chatwoot" ON public.integracao_chatwoot;
CREATE POLICY "Permitir atualização pública de configuração Chatwoot"
ON public.integracao_chatwoot FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusão pública de configuração Chatwoot" ON public.integracao_chatwoot;
CREATE POLICY "Permitir exclusão pública de configuração Chatwoot"
ON public.integracao_chatwoot FOR DELETE USING (true);

-- Políticas RLS para webhook_config
DROP POLICY IF EXISTS "Permitir leitura pública de webhooks" ON public.webhook_config;
CREATE POLICY "Permitir leitura pública de webhooks"
ON public.webhook_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção pública de webhooks" ON public.webhook_config;
CREATE POLICY "Permitir inserção pública de webhooks"
ON public.webhook_config FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização pública de webhooks" ON public.webhook_config;
CREATE POLICY "Permitir atualização pública de webhooks"
ON public.webhook_config FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusão pública de webhooks" ON public.webhook_config;
CREATE POLICY "Permitir exclusão pública de webhooks"
ON public.webhook_config FOR DELETE USING (true);

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_integracao_chatwoot_updated_at ON public.integracao_chatwoot;
CREATE TRIGGER update_integracao_chatwoot_updated_at
BEFORE UPDATE ON public.integracao_chatwoot
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_webhook_config_updated_at ON public.webhook_config;
CREATE TRIGGER update_webhook_config_updated_at
BEFORE UPDATE ON public.webhook_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251103141350
-- Corrigir function update_updated_at_column para definir search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SET search_path = public;

-- Corrigir function update_card_on_atividade para definir search_path
CREATE OR REPLACE FUNCTION public.update_card_on_atividade()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.cards_conversas
  SET updated_at = now()
  WHERE id = NEW.card_id;
  RETURN NEW;
END;
$$;

-- Migration: 20251104153619
-- Adicionar colunas em cards_conversas
ALTER TABLE cards_conversas 
  ADD COLUMN IF NOT EXISTS funil_id UUID REFERENCES funis(id),
  ADD COLUMN IF NOT EXISTS funil_nome TEXT,
  ADD COLUMN IF NOT EXISTS funil_etapa TEXT,
  ADD COLUMN IF NOT EXISTS data_retorno DATE DEFAULT (CURRENT_DATE + INTERVAL '7 days');

-- Atualizar default de data_retorno
ALTER TABLE cards_conversas 
  ALTER COLUMN data_retorno SET DEFAULT (CURRENT_DATE + INTERVAL '7 days');

-- Adicionar constraint única para permitir ON CONFLICT
ALTER TABLE etapas ADD CONSTRAINT etapas_funil_ordem_unique UNIQUE (funil_id, ordem);

-- Adicionar constraint única para funis.nome se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'funis_nome_unique'
  ) THEN
    ALTER TABLE funis ADD CONSTRAINT funis_nome_unique UNIQUE (nome);
  END IF;
END $$;

-- Inserir funis (idempotente)
INSERT INTO funis (nome) 
VALUES ('Comercial'), ('Administrativo')
ON CONFLICT (nome) DO NOTHING;

-- Inserir etapas do funil Comercial (idempotente)
INSERT INTO etapas (funil_id, nome, ordem)
SELECT f.id, unnest(ARRAY['Prospecção', 'Qualificação', 'Apresentação', 'Negociação', 'Fechamento', 'Ganho/Perdido']), 
       generate_series(1, 6)
FROM funis f
WHERE f.nome = 'Comercial'
ON CONFLICT (funil_id, ordem) DO NOTHING;

-- Inserir etapas do funil Administrativo (idempotente)
INSERT INTO etapas (funil_id, nome, ordem)
SELECT f.id, unnest(ARRAY['Demanda Aberta', 'Em Análise', 'Em Resolução', 'Aguardando Retorno', 'Resolvido', 'Concluído']), 
       generate_series(1, 6)
FROM funis f
WHERE f.nome = 'Administrativo'
ON CONFLICT (funil_id, ordem) DO NOTHING;


-- Migration: 20251104181330
-- Adicionar coluna bidir_enabled para controlar sync bidirecional
ALTER TABLE integracao_chatwoot ADD COLUMN IF NOT EXISTS bidir_enabled BOOLEAN DEFAULT FALSE;

-- Comentário explicativo
COMMENT ON COLUMN integracao_chatwoot.bidir_enabled IS 'Controla se o sync bidirecional Chatwoot → Lovable está ativo';


-- Migration: 20251104192715
-- Criar tabela de usuários CRM
CREATE TABLE IF NOT EXISTS public.users_crm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nome TEXT,
  role TEXT DEFAULT 'agent',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de permissões
CREATE TABLE IF NOT EXISTS public.permissions (
  role TEXT PRIMARY KEY,
  criar_card BOOLEAN DEFAULT false,
  editar_card BOOLEAN DEFAULT false,
  deletar_card BOOLEAN DEFAULT false,
  ver_dashboard BOOLEAN DEFAULT false,
  gerenciar_usuarios BOOLEAN DEFAULT false,
  ver_relatorios BOOLEAN DEFAULT false
);

-- Inserir permissões padrão
INSERT INTO public.permissions (role, criar_card, editar_card, deletar_card, ver_dashboard, gerenciar_usuarios, ver_relatorios) VALUES
('admin', true, true, true, true, true, true),
('manager', true, true, false, true, false, true),
('agent', true, true, false, true, false, false),
('viewer', false, false, false, true, false, false)
ON CONFLICT (role) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.users_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (todos podem ler)
CREATE POLICY "Permitir leitura pública de users_crm" ON public.users_crm FOR SELECT USING (true);
CREATE POLICY "Permitir atualização pública de users_crm" ON public.users_crm FOR UPDATE USING (true);
CREATE POLICY "Permitir inserção pública de users_crm" ON public.users_crm FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir exclusão pública de users_crm" ON public.users_crm FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública de permissions" ON public.permissions FOR SELECT USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_users_crm_updated_at
BEFORE UPDATE ON public.users_crm
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20251104195124
-- 1. Adicionar coluna PRIVADO (bloqueia private-message-sync)
ALTER TABLE atividades_cards ADD COLUMN IF NOT EXISTS privado BOOLEAN DEFAULT false;

-- 2. Corrigir funis (5 → conforme spec)
DELETE FROM etapas WHERE funil_id IN (SELECT id FROM funis WHERE nome IN ('Vendas Corporativas','Atendimento'));
DELETE FROM funis WHERE nome IN ('Vendas Corporativas','Atendimento');

INSERT INTO funis (nome) VALUES 
  ('Eventos Colisão'),
  ('Eventos Terceiros'),
  ('Suporte ADM Associado'),
  ('Suporte ADM Consultor')
ON CONFLICT DO NOTHING;

-- 3. Recrear etapas corretas (COMERCIAL + 4 ADMIN com 4 etapas cada)
DELETE FROM etapas WHERE funil_id IN (SELECT id FROM funis WHERE nome IN 
  ('Comercial','Eventos Colisão','Eventos Terceiros','Suporte ADM Associado','Suporte ADM Consultor'));

-- Comercial: 5 etapas
INSERT INTO etapas (funil_id, nome, ordem) VALUES
  ((SELECT id FROM funis WHERE nome='Comercial'), 'Contato Inicial', 1),
  ((SELECT id FROM funis WHERE nome='Comercial'), 'Qualificação Agendada', 2),
  ((SELECT id FROM funis WHERE nome='Comercial'), 'Cotação Enviada | FollowUp', 3),
  ((SELECT id FROM funis WHERE nome='Comercial'), 'Negociação', 4),
  ((SELECT id FROM funis WHERE nome='Comercial'), 'Em Fechamento', 5);

-- Admin (4 funis × 4 etapas)
DO $$
DECLARE 
  f RECORD; 
  etapas TEXT[] := ARRAY['Demanda Aberta','Em Resolução','Aguardando Retorno','Concluído/Arquivado'];
BEGIN
  FOR f IN SELECT id, nome FROM funis WHERE nome IN ('Eventos Colisão','Eventos Terceiros','Suporte ADM Associado','Suporte ADM Consultor')
  LOOP
    FOR i IN 1..4 LOOP
      INSERT INTO etapas (funil_id, nome, ordem) VALUES (f.id, etapas[i], i);
    END LOOP;
  END LOOP;
END$$;

-- 4. RLS: Trocar de PÚBLICO para AUTENTICADO (políticas mínimas)
-- Remover políticas públicas antigas
DROP POLICY IF EXISTS "Permitir leitura pública de cards" ON cards_conversas;
DROP POLICY IF EXISTS "Permitir inserção pública de cards" ON cards_conversas;
DROP POLICY IF EXISTS "Permitir atualização pública de cards" ON cards_conversas;
DROP POLICY IF EXISTS "Permitir exclusão pública de cards" ON cards_conversas;

DROP POLICY IF EXISTS "Permitir leitura pública de atividades" ON atividades_cards;
DROP POLICY IF EXISTS "Permitir inserção pública de atividades" ON atividades_cards;
DROP POLICY IF EXISTS "Permitir atualização pública de atividades" ON atividades_cards;
DROP POLICY IF EXISTS "Permitir exclusão pública de atividades" ON atividades_cards;

DROP POLICY IF EXISTS "Permitir leitura pública de funis" ON funis;
DROP POLICY IF EXISTS "Permitir inserção pública de funis" ON funis;
DROP POLICY IF EXISTS "Permitir atualização pública de funis" ON funis;
DROP POLICY IF EXISTS "Permitir exclusão pública de funis" ON funis;

DROP POLICY IF EXISTS "Permitir leitura pública de etapas" ON etapas;
DROP POLICY IF EXISTS "Permitir inserção pública de etapas" ON etapas;
DROP POLICY IF EXISTS "Permitir atualização pública de etapas" ON etapas;
DROP POLICY IF EXISTS "Permitir exclusão pública de etapas" ON etapas;

DROP POLICY IF EXISTS "Permitir leitura pública de users_crm" ON users_crm;
DROP POLICY IF EXISTS "Permitir inserção pública de users_crm" ON users_crm;
DROP POLICY IF EXISTS "Permitir atualização pública de users_crm" ON users_crm;
DROP POLICY IF EXISTS "Permitir exclusão pública de users_crm" ON users_crm;

DROP POLICY IF EXISTS "Permitir leitura pública de configuração Chatwoot" ON integracao_chatwoot;
DROP POLICY IF EXISTS "Permitir inserção pública de configuração Chatwoot" ON integracao_chatwoot;
DROP POLICY IF EXISTS "Permitir atualização pública de configuração Chatwoot" ON integracao_chatwoot;
DROP POLICY IF EXISTS "Permitir exclusão pública de configuração Chatwoot" ON integracao_chatwoot;

DROP POLICY IF EXISTS "Permitir leitura pública de webhooks" ON webhook_config;
DROP POLICY IF EXISTS "Permitir inserção pública de webhooks" ON webhook_config;
DROP POLICY IF EXISTS "Permitir atualização pública de webhooks" ON webhook_config;
DROP POLICY IF EXISTS "Permitir exclusão pública de webhooks" ON webhook_config;

-- Criar políticas autenticadas básicas (temporário, depois implementar por role)
CREATE POLICY "Usuários autenticados podem ler cards" ON cards_conversas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir cards" ON cards_conversas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar cards" ON cards_conversas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar cards" ON cards_conversas FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler atividades" ON atividades_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir atividades" ON atividades_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar atividades" ON atividades_cards FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar atividades" ON atividades_cards FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler funis" ON funis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir funis" ON funis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar funis" ON funis FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar funis" ON funis FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler etapas" ON etapas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir etapas" ON etapas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar etapas" ON etapas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar etapas" ON etapas FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler users_crm" ON users_crm FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir users_crm" ON users_crm FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar users_crm" ON users_crm FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar users_crm" ON users_crm FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler config Chatwoot" ON integracao_chatwoot FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir config Chatwoot" ON integracao_chatwoot FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar config Chatwoot" ON integracao_chatwoot FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar config Chatwoot" ON integracao_chatwoot FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ler webhooks" ON webhook_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem inserir webhooks" ON webhook_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuários autenticados podem atualizar webhooks" ON webhook_config FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Usuários autenticados podem deletar webhooks" ON webhook_config FOR DELETE TO authenticated USING (true);

-- Migration: 20251104200110
-- 1. Adicionar coluna gerenciar_smtp à tabela permissions
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS gerenciar_smtp BOOLEAN DEFAULT false;

-- 2. Criar tabela smtp_config
CREATE TABLE IF NOT EXISTS smtp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL,
  smtp_user TEXT NOT NULL,
  smtp_password TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT DEFAULT 'CRM Lovable',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Inserir/atualizar permissões com gerenciar_smtp
INSERT INTO permissions (role, criar_card, editar_card, deletar_card, ver_dashboard, ver_relatorios, gerenciar_usuarios, gerenciar_smtp) VALUES
('admin', true, true, true, true, true, true, true),
('manager', true, true, false, true, false, true, false),
('agent', true, true, false, true, false, false, false),
('viewer', false, false, false, true, false, false, false)
ON CONFLICT (role) DO UPDATE SET 
  criar_card = EXCLUDED.criar_card,
  editar_card = EXCLUDED.editar_card,
  deletar_card = EXCLUDED.deletar_card,
  ver_dashboard = EXCLUDED.ver_dashboard,
  ver_relatorios = EXCLUDED.ver_relatorios,
  gerenciar_usuarios = EXCLUDED.gerenciar_usuarios,
  gerenciar_smtp = EXCLUDED.gerenciar_smtp;

-- 4. Criar security definer function para verificar role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_email TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users_crm WHERE email = _user_email LIMIT 1;
$$;

-- 5. Habilitar RLS na tabela smtp_config
ALTER TABLE smtp_config ENABLE ROW LEVEL SECURITY;

-- 6. Criar policies para smtp_config
CREATE POLICY "smtp_select_authenticated" ON smtp_config 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "smtp_insert_admin" ON smtp_config 
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "smtp_update_admin" ON smtp_config 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin')
  WITH CHECK (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "smtp_delete_admin" ON smtp_config 
  FOR DELETE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

-- Migration: 20251104200202
-- 1. Adicionar coluna gerenciar_smtp à tabela permissions
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS gerenciar_smtp BOOLEAN DEFAULT false;

-- 2. Criar tabela smtp_config
CREATE TABLE IF NOT EXISTS smtp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL,
  smtp_user TEXT NOT NULL,
  smtp_password TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT DEFAULT 'CRM Lovable',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Inserir/atualizar permissões com gerenciar_smtp
INSERT INTO permissions (role, criar_card, editar_card, deletar_card, ver_dashboard, ver_relatorios, gerenciar_usuarios, gerenciar_smtp) VALUES
('admin', true, true, true, true, true, true, true),
('manager', true, true, false, true, false, true, false),
('agent', true, true, false, true, false, false, false),
('viewer', false, false, false, true, false, false, false)
ON CONFLICT (role) DO UPDATE SET 
  criar_card = EXCLUDED.criar_card,
  editar_card = EXCLUDED.editar_card,
  deletar_card = EXCLUDED.deletar_card,
  ver_dashboard = EXCLUDED.ver_dashboard,
  ver_relatorios = EXCLUDED.ver_relatorios,
  gerenciar_usuarios = EXCLUDED.gerenciar_usuarios,
  gerenciar_smtp = EXCLUDED.gerenciar_smtp;

-- 4. Criar security definer function para verificar role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_email TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users_crm WHERE email = _user_email LIMIT 1;
$$;

-- 5. Habilitar RLS na tabela smtp_config
ALTER TABLE smtp_config ENABLE ROW LEVEL SECURITY;

-- 6. Dropar policies antigas se existirem
DROP POLICY IF EXISTS "smtp_select_authenticated" ON smtp_config;
DROP POLICY IF EXISTS "smtp_insert_admin" ON smtp_config;
DROP POLICY IF EXISTS "smtp_update_admin" ON smtp_config;
DROP POLICY IF EXISTS "smtp_delete_admin" ON smtp_config;

-- 7. Criar policies para smtp_config
CREATE POLICY "smtp_select_authenticated" ON smtp_config 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "smtp_insert_admin" ON smtp_config 
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "smtp_update_admin" ON smtp_config 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin')
  WITH CHECK (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "smtp_delete_admin" ON smtp_config 
  FOR DELETE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

-- Migration: 20251104200225
-- 1. Adicionar coluna gerenciar_smtp à tabela permissions
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS gerenciar_smtp BOOLEAN DEFAULT false;

-- 2. Criar tabela smtp_config
CREATE TABLE IF NOT EXISTS smtp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL,
  smtp_user TEXT NOT NULL,
  smtp_password TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT DEFAULT 'CRM Lovable',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Inserir/atualizar permissões com gerenciar_smtp
INSERT INTO permissions (role, criar_card, editar_card, deletar_card, ver_dashboard, ver_relatorios, gerenciar_usuarios, gerenciar_smtp) VALUES
('admin', true, true, true, true, true, true, true),
('manager', true, true, false, true, false, true, false),
('agent', true, true, false, true, false, false, false),
('viewer', false, false, false, true, false, false, false)
ON CONFLICT (role) DO UPDATE SET 
  criar_card = EXCLUDED.criar_card,
  editar_card = EXCLUDED.editar_card,
  deletar_card = EXCLUDED.deletar_card,
  ver_dashboard = EXCLUDED.ver_dashboard,
  ver_relatorios = EXCLUDED.ver_relatorios,
  gerenciar_usuarios = EXCLUDED.gerenciar_usuarios,
  gerenciar_smtp = EXCLUDED.gerenciar_smtp;

-- 4. Criar security definer function para verificar role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_email TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users_crm WHERE email = _user_email LIMIT 1;
$$;

-- 5. Habilitar RLS na tabela smtp_config
ALTER TABLE smtp_config ENABLE ROW LEVEL SECURITY;

-- 6. Dropar policies antigas se existirem
DROP POLICY IF EXISTS "smtp_select_authenticated" ON smtp_config;
DROP POLICY IF EXISTS "smtp_insert_admin" ON smtp_config;
DROP POLICY IF EXISTS "smtp_update_admin" ON smtp_config;
DROP POLICY IF EXISTS "smtp_delete_admin" ON smtp_config;

-- 7. Criar policies para smtp_config
CREATE POLICY "smtp_select_authenticated" ON smtp_config 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "smtp_insert_admin" ON smtp_config 
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "smtp_update_admin" ON smtp_config 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin')
  WITH CHECK (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "smtp_delete_admin" ON smtp_config 
  FOR DELETE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');


-- Migration: 20251104203044
-- FASE 3: RLS Roles + Vault Secrets

-- 1. Adicionar coluna assigned_to em cards_conversas
ALTER TABLE cards_conversas ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users_crm(id);

-- 2. REMOVER policies genéricas authenticated
DROP POLICY IF EXISTS "Usuários autenticados podem ler cards" ON cards_conversas;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir cards" ON cards_conversas;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar cards" ON cards_conversas;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar cards" ON cards_conversas;

DROP POLICY IF EXISTS "Usuários autenticados podem ler atividades" ON atividades_cards;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir atividades" ON atividades_cards;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar atividades" ON atividades_cards;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar atividades" ON atividades_cards;

DROP POLICY IF EXISTS "Usuários autenticados podem ler funis" ON funis;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir funis" ON funis;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar funis" ON funis;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar funis" ON funis;

DROP POLICY IF EXISTS "Usuários autenticados podem ler etapas" ON etapas;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir etapas" ON etapas;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar etapas" ON etapas;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar etapas" ON etapas;

DROP POLICY IF EXISTS "Usuários autenticados podem ler users_crm" ON users_crm;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir users_crm" ON users_crm;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar users_crm" ON users_crm;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar users_crm" ON users_crm;

DROP POLICY IF EXISTS "Usuários autenticados podem ler config Chatwoot" ON integracao_chatwoot;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir config Chatwoot" ON integracao_chatwoot;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar config Chatwoot" ON integracao_chatwoot;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar config Chatwoot" ON integracao_chatwoot;

DROP POLICY IF EXISTS "Usuários autenticados podem ler webhooks" ON webhook_config;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir webhooks" ON webhook_config;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar webhooks" ON webhook_config;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar webhooks" ON webhook_config;

-- 3. CRIAR policies baseadas em ROLES usando get_user_role

-- cards_conversas
CREATE POLICY "Admin pode ler todos os cards" ON cards_conversas 
  FOR SELECT TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Manager pode ler cards do funil Comercial" ON cards_conversas 
  FOR SELECT TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'manager' AND funil_nome = 'Comercial');

CREATE POLICY "Agent pode ler seus próprios cards" ON cards_conversas 
  FOR SELECT TO authenticated 
  USING (
    public.get_user_role(auth.jwt() ->> 'email') = 'agent' 
    AND assigned_to = (SELECT id FROM users_crm WHERE email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Viewer pode ler todos os cards" ON cards_conversas 
  FOR SELECT TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'viewer');

CREATE POLICY "Admin pode inserir cards" ON cards_conversas 
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Manager pode inserir cards do funil Comercial" ON cards_conversas 
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role(auth.jwt() ->> 'email') = 'manager' AND funil_nome = 'Comercial');

CREATE POLICY "Agent pode inserir seus próprios cards" ON cards_conversas 
  FOR INSERT TO authenticated 
  WITH CHECK (
    public.get_user_role(auth.jwt() ->> 'email') = 'agent'
    AND assigned_to = (SELECT id FROM users_crm WHERE email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Admin pode atualizar todos os cards" ON cards_conversas 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Manager pode atualizar cards do funil Comercial" ON cards_conversas 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'manager' AND funil_nome = 'Comercial');

CREATE POLICY "Agent pode atualizar seus próprios cards" ON cards_conversas 
  FOR UPDATE TO authenticated 
  USING (
    public.get_user_role(auth.jwt() ->> 'email') = 'agent'
    AND assigned_to = (SELECT id FROM users_crm WHERE email = auth.jwt() ->> 'email')
  );

CREATE POLICY "Admin pode deletar cards" ON cards_conversas 
  FOR DELETE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

-- atividades_cards
CREATE POLICY "Admin pode ler todas as atividades" ON atividades_cards 
  FOR SELECT TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Manager pode ler atividades de cards do funil Comercial" ON atividades_cards 
  FOR SELECT TO authenticated 
  USING (
    public.get_user_role(auth.jwt() ->> 'email') = 'manager' 
    AND card_id IN (SELECT id FROM cards_conversas WHERE funil_nome = 'Comercial')
  );

CREATE POLICY "Agent pode ler atividades de seus cards" ON atividades_cards 
  FOR SELECT TO authenticated 
  USING (
    public.get_user_role(auth.jwt() ->> 'email') = 'agent'
    AND card_id IN (
      SELECT id FROM cards_conversas 
      WHERE assigned_to = (SELECT id FROM users_crm WHERE email = auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Viewer pode ler todas as atividades" ON atividades_cards 
  FOR SELECT TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'viewer');

CREATE POLICY "Admin/Manager/Agent podem inserir atividades" ON atividades_cards 
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role(auth.jwt() ->> 'email') IN ('admin', 'manager', 'agent'));

CREATE POLICY "Admin pode atualizar atividades" ON atividades_cards 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Admin pode deletar atividades" ON atividades_cards 
  FOR DELETE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

-- funis
CREATE POLICY "Todos podem ler funis" ON funis 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "Admin pode inserir funis" ON funis 
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Admin pode atualizar funis" ON funis 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Admin pode deletar funis" ON funis 
  FOR DELETE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

-- etapas
CREATE POLICY "Todos podem ler etapas" ON etapas 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "Admin pode inserir etapas" ON etapas 
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Admin pode atualizar etapas" ON etapas 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Admin pode deletar etapas" ON etapas 
  FOR DELETE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

-- users_crm
CREATE POLICY "Todos podem ler users_crm" ON users_crm 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "Admin pode inserir users_crm" ON users_crm 
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Admin pode atualizar users_crm" ON users_crm 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Admin pode deletar users_crm" ON users_crm 
  FOR DELETE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

-- integracao_chatwoot
CREATE POLICY "Todos podem ler config Chatwoot" ON integracao_chatwoot 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "Admin pode inserir config Chatwoot" ON integracao_chatwoot 
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Admin pode atualizar config Chatwoot" ON integracao_chatwoot 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Admin pode deletar config Chatwoot" ON integracao_chatwoot 
  FOR DELETE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

-- webhook_config
CREATE POLICY "Todos podem ler webhooks" ON webhook_config 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "Admin pode inserir webhooks" ON webhook_config 
  FOR INSERT TO authenticated 
  WITH CHECK (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Admin pode atualizar webhooks" ON webhook_config 
  FOR UPDATE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

CREATE POLICY "Admin pode deletar webhooks" ON webhook_config 
  FOR DELETE TO authenticated 
  USING (public.get_user_role(auth.jwt() ->> 'email') = 'admin');

-- 4. VAULT SECRETS: Migrar api_key e smtp_password para vault.secrets
-- Nota: Supabase Vault secrets são gerenciados via CLI/Dashboard, não via SQL direto
-- Remover colunas de texto plano após migração manual
-- COMENTADO para não quebrar até migração manual dos secrets:
-- ALTER TABLE integracao_chatwoot DROP COLUMN IF EXISTS api_key;
-- ALTER TABLE smtp_config DROP COLUMN IF EXISTS smtp_password;

-- Migration: 20251104203345
-- FASE 3: Remover colunas de segredos em texto plano

-- Remover coluna api_key de integracao_chatwoot (agora usa CHATWOOT_API_KEY env)
ALTER TABLE integracao_chatwoot DROP COLUMN IF EXISTS api_key;

-- Remover coluna smtp_password de smtp_config (agora usa RESEND_API_KEY env)
ALTER TABLE smtp_config DROP COLUMN IF EXISTS smtp_password;

-- Migration: 20251104204454
-- =====================================================
-- FASE 1: ADICIONAR COLUNAS E ATUALIZAR SCHEMA
-- =====================================================

-- Adicionar coluna approved em users_crm
ALTER TABLE public.users_crm 
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

-- Adicionar colunas de permissões adicionais em permissions
ALTER TABLE public.permissions 
ADD COLUMN IF NOT EXISTS edit_funil BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS edit_etapas BOOLEAN DEFAULT false;

-- Adicionar colunas de permissões em users_crm para controle individual
ALTER TABLE public.users_crm 
ADD COLUMN IF NOT EXISTS edit_funil BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS edit_etapas BOOLEAN DEFAULT false;

-- =====================================================
-- FASE 2: INSERIR PERMISSÕES MASTER
-- =====================================================

-- Inserir/atualizar permissões para role master
INSERT INTO public.permissions (
  role, 
  criar_card, 
  editar_card, 
  deletar_card, 
  ver_dashboard, 
  gerenciar_usuarios, 
  ver_relatorios, 
  gerenciar_smtp,
  edit_funil,
  edit_etapas
) VALUES (
  'master', 
  true, 
  true, 
  true, 
  true, 
  true, 
  true, 
  true,
  true,
  true
) ON CONFLICT (role) DO UPDATE SET
  criar_card = true,
  editar_card = true,
  deletar_card = true,
  ver_dashboard = true,
  gerenciar_usuarios = true,
  ver_relatorios = true,
  gerenciar_smtp = true,
  edit_funil = true,
  edit_etapas = true;

-- =====================================================
-- FASE 3: ATUALIZAR RLS POLICIES - CONFIG TABLES (MASTER ONLY)
-- =====================================================

-- Drop policies antigas de integracao_chatwoot
DROP POLICY IF EXISTS "Todos podem ler config Chatwoot" ON public.integracao_chatwoot;
DROP POLICY IF EXISTS "Admin pode inserir config Chatwoot" ON public.integracao_chatwoot;
DROP POLICY IF EXISTS "Admin pode atualizar config Chatwoot" ON public.integracao_chatwoot;
DROP POLICY IF EXISTS "Admin pode deletar config Chatwoot" ON public.integracao_chatwoot;

-- Criar policies master-only para integracao_chatwoot
CREATE POLICY "Master pode ler config Chatwoot" 
ON public.integracao_chatwoot FOR SELECT 
USING (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);

CREATE POLICY "Master pode inserir config Chatwoot" 
ON public.integracao_chatwoot FOR INSERT 
WITH CHECK (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);

CREATE POLICY "Master pode atualizar config Chatwoot" 
ON public.integracao_chatwoot FOR UPDATE 
USING (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);

CREATE POLICY "Master pode deletar config Chatwoot" 
ON public.integracao_chatwoot FOR DELETE 
USING (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);

-- Drop policies antigas de smtp_config
DROP POLICY IF EXISTS "smtp_select_authenticated" ON public.smtp_config;
DROP POLICY IF EXISTS "smtp_insert_admin" ON public.smtp_config;
DROP POLICY IF EXISTS "smtp_update_admin" ON public.smtp_config;
DROP POLICY IF EXISTS "smtp_delete_admin" ON public.smtp_config;

-- Criar policies master-only para smtp_config
CREATE POLICY "Master pode ler SMTP" 
ON public.smtp_config FOR SELECT 
USING (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);

CREATE POLICY "Master pode inserir SMTP" 
ON public.smtp_config FOR INSERT 
WITH CHECK (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);

CREATE POLICY "Master pode atualizar SMTP" 
ON public.smtp_config FOR UPDATE 
USING (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);

CREATE POLICY "Master pode deletar SMTP" 
ON public.smtp_config FOR DELETE 
USING (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);

-- Drop policies antigas de webhook_config
DROP POLICY IF EXISTS "Todos podem ler webhooks" ON public.webhook_config;
DROP POLICY IF EXISTS "Admin pode inserir webhooks" ON public.webhook_config;
DROP POLICY IF EXISTS "Admin pode atualizar webhooks" ON public.webhook_config;
DROP POLICY IF EXISTS "Admin pode deletar webhooks" ON public.webhook_config;

-- Criar policies master-only para webhook_config
CREATE POLICY "Master pode ler webhooks" 
ON public.webhook_config FOR SELECT 
USING (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);

CREATE POLICY "Master pode inserir webhooks" 
ON public.webhook_config FOR INSERT 
WITH CHECK (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);

CREATE POLICY "Master pode atualizar webhooks" 
ON public.webhook_config FOR UPDATE 
USING (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);

CREATE POLICY "Master pode deletar webhooks" 
ON public.webhook_config FOR DELETE 
USING (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);

-- =====================================================
-- FASE 4: ATUALIZAR RLS POLICIES - FUNIS E ETAPAS (PERMISSION-BASED)
-- =====================================================

-- Drop policies antigas de funis
DROP POLICY IF EXISTS "Admin pode inserir funis" ON public.funis;
DROP POLICY IF EXISTS "Admin pode atualizar funis" ON public.funis;
DROP POLICY IF EXISTS "Admin pode deletar funis" ON public.funis;

-- Criar policies baseadas em permissões para funis
CREATE POLICY "Usuários aprovados com permissão podem inserir funis" 
ON public.funis FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users_crm 
    WHERE id = auth.uid() 
    AND approved = true 
    AND (role = 'master' OR edit_funil = true)
  )
);

CREATE POLICY "Usuários aprovados com permissão podem atualizar funis" 
ON public.funis FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users_crm 
    WHERE id = auth.uid() 
    AND approved = true 
    AND (role = 'master' OR edit_funil = true)
  )
);

CREATE POLICY "Usuários aprovados com permissão podem deletar funis" 
ON public.funis FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users_crm 
    WHERE id = auth.uid() 
    AND approved = true 
    AND (role = 'master' OR edit_funil = true)
  )
);

-- Drop policies antigas de etapas
DROP POLICY IF EXISTS "Admin pode inserir etapas" ON public.etapas;
DROP POLICY IF EXISTS "Admin pode atualizar etapas" ON public.etapas;
DROP POLICY IF EXISTS "Admin pode deletar etapas" ON public.etapas;

-- Criar policies baseadas em permissões para etapas
CREATE POLICY "Usuários aprovados com permissão podem inserir etapas" 
ON public.etapas FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users_crm 
    WHERE id = auth.uid() 
    AND approved = true 
    AND (role = 'master' OR edit_etapas = true)
  )
);

CREATE POLICY "Usuários aprovados com permissão podem atualizar etapas" 
ON public.etapas FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.users_crm 
    WHERE id = auth.uid() 
    AND approved = true 
    AND (role = 'master' OR edit_etapas = true)
  )
);

CREATE POLICY "Usuários aprovados com permissão podem deletar etapas" 
ON public.etapas FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.users_crm 
    WHERE id = auth.uid() 
    AND approved = true 
    AND (role = 'master' OR edit_etapas = true)
  )
);

-- =====================================================
-- FASE 5: ATUALIZAR POLICIES DE USERS_CRM PARA MASTER
-- =====================================================

-- Drop policies antigas
DROP POLICY IF EXISTS "Admin pode inserir users_crm" ON public.users_crm;
DROP POLICY IF EXISTS "Admin pode atualizar users_crm" ON public.users_crm;
DROP POLICY IF EXISTS "Admin pode deletar users_crm" ON public.users_crm;

-- Recriar com suporte a master
CREATE POLICY "Master pode inserir users_crm" 
ON public.users_crm FOR INSERT 
WITH CHECK (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);

CREATE POLICY "Master pode atualizar users_crm" 
ON public.users_crm FOR UPDATE 
USING (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);

CREATE POLICY "Master pode deletar users_crm" 
ON public.users_crm FOR DELETE 
USING (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master' 
  OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'
);


-- Migration: 20251104212936
-- Dropar tabela smtp_config
DROP TABLE IF EXISTS public.smtp_config;

-- Adicionar colunas de permissões em users_crm
ALTER TABLE public.users_crm 
  ADD COLUMN IF NOT EXISTS criar_card BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS editar_card BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deletar_card BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ver_relatorios BOOLEAN DEFAULT false;

-- Adicionar coluna api_key em integracao_chatwoot
ALTER TABLE public.integracao_chatwoot
  ADD COLUMN IF NOT EXISTS api_key TEXT;

-- Atualizar bidir_enabled para true por padrão
ALTER TABLE public.integracao_chatwoot 
  ALTER COLUMN bidir_enabled SET DEFAULT true;

-- Atualizar registros existentes para bidir_enabled=true
UPDATE public.integracao_chatwoot 
SET bidir_enabled = true 
WHERE bidir_enabled IS NULL OR bidir_enabled = false;
