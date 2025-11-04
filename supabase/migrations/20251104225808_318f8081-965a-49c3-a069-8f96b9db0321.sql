-- Add UNIQUE constraint for upsert to work correctly (drop first if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cards_conversas_chatwoot_conversa_id_key'
  ) THEN
    ALTER TABLE cards_conversas 
    ADD CONSTRAINT cards_conversas_chatwoot_conversa_id_key 
    UNIQUE (chatwoot_conversa_id);
  END IF;
END $$;

-- Make etapa_id nullable
ALTER TABLE cards_conversas 
ALTER COLUMN etapa_id DROP NOT NULL;

-- Add chatwoot_message_id to prevent duplicate private messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'atividades_cards' AND column_name = 'chatwoot_message_id'
  ) THEN
    ALTER TABLE atividades_cards 
    ADD COLUMN chatwoot_message_id BIGINT UNIQUE;
  END IF;
END $$;

-- Create webhooks_config table
CREATE TABLE IF NOT EXISTS webhooks_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  url TEXT,
  inbox_path TEXT UNIQUE NOT NULL,
  events TEXT[] DEFAULT ARRAY['conversation_updated', 'message_created'],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on webhooks_config
ALTER TABLE webhooks_config ENABLE ROW LEVEL SECURITY;

-- Super admin policy for webhooks_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'webhooks_config' AND policyname = 'Super admin full access webhooks'
  ) THEN
    CREATE POLICY "Super admin full access webhooks" 
    ON webhooks_config 
    FOR ALL 
    USING (
      (auth.jwt() ->> 'email' = 'jmacedoneto1989@gmail.com') OR 
      (auth.jwt() ->> 'role' = 'super_admin')
    );
  END IF;
END $$;

-- Update integracao_chatwoot policies
DROP POLICY IF EXISTS "Master pode ler config Chatwoot" ON integracao_chatwoot;
CREATE POLICY "Master/Super pode ler config Chatwoot" 
ON integracao_chatwoot 
FOR SELECT 
USING (
  (get_user_role((auth.jwt() ->> 'email')) = 'master') OR 
  (auth.jwt() ->> 'email' = 'jmacedoneto1989@gmail.com')
);

DROP POLICY IF EXISTS "Master pode inserir config Chatwoot" ON integracao_chatwoot;
CREATE POLICY "Master/Super pode inserir config Chatwoot" 
ON integracao_chatwoot 
FOR INSERT 
WITH CHECK (
  (get_user_role((auth.jwt() ->> 'email')) = 'master') OR 
  (auth.jwt() ->> 'email' = 'jmacedoneto1989@gmail.com')
);

DROP POLICY IF EXISTS "Master pode atualizar config Chatwoot" ON integracao_chatwoot;
CREATE POLICY "Master/Super pode atualizar config Chatwoot" 
ON integracao_chatwoot 
FOR UPDATE 
USING (
  (get_user_role((auth.jwt() ->> 'email')) = 'master') OR 
  (auth.jwt() ->> 'email' = 'jmacedoneto1989@gmail.com')
);

DROP POLICY IF EXISTS "Master pode deletar config Chatwoot" ON integracao_chatwoot;
CREATE POLICY "Master/Super pode deletar config Chatwoot" 
ON integracao_chatwoot 
FOR DELETE 
USING (
  (get_user_role((auth.jwt() ->> 'email')) = 'master') OR 
  (auth.jwt() ->> 'email' = 'jmacedoneto1989@gmail.com')
);

-- Insert seed webhooks
INSERT INTO webhooks_config (name, url, inbox_path, events, active) 
VALUES 
  ('Meu Comercial', 'https://evolution.apvsiguatemi.net/chatwoot/webhook/Meu%20Comercial', '/Meu%20Comercial', ARRAY['conversation_updated', 'message_created'], true),
  ('Atendimento Regional', 'https://evolution.apvsiguatemi.net/chatwoot/webhook/Atendimento%20Regional', '/Atendimento%20Regional', ARRAY['conversation_updated', 'message_created'], true)
ON CONFLICT (inbox_path) DO UPDATE 
SET active = true, events = ARRAY['conversation_updated', 'message_created'];

-- Create trigger to update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_webhooks_config_updated_at'
  ) THEN
    CREATE TRIGGER update_webhooks_config_updated_at
    BEFORE UPDATE ON webhooks_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;