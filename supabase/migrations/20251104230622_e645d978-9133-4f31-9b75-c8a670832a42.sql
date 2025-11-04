-- Create mappings_config table for intelligent label/attr correlation
CREATE TABLE IF NOT EXISTS mappings_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chatwoot_type TEXT NOT NULL CHECK (chatwoot_type IN ('label', 'attr')),
  chatwoot_key TEXT NOT NULL,
  chatwoot_value TEXT,
  lovable_funil TEXT,
  lovable_etapa TEXT,
  ordem INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chatwoot_type, chatwoot_key, chatwoot_value)
);

-- Enable RLS
ALTER TABLE mappings_config ENABLE ROW LEVEL SECURITY;

-- Super admin policy
CREATE POLICY "Super admin full access mappings" 
ON mappings_config 
FOR ALL 
USING (
  (auth.jwt() ->> 'email' = 'jmacedoneto1989@gmail.com') OR 
  (auth.jwt() ->> 'role' = 'super_admin')
);

-- Insert seed mappings (8 examples)
INSERT INTO mappings_config (chatwoot_type, chatwoot_key, chatwoot_value, lovable_funil, lovable_etapa, ordem) 
VALUES 
  -- Label mappings for funil
  ('label', 'comercial', null, 'Comercial', null, 1),
  ('label', 'regional', null, 'Administrativo', null, 1),
  ('label', 'ig_comercial', null, 'Comercial', null, 1),
  
  -- Label mappings for etapa
  ('label', 'etapa_negociacao', null, null, 'Negociação', 2),
  ('label', 'etapa_demanda_aberta', null, null, 'Demanda Aberta', 2),
  
  -- Attr mappings with specific values
  ('attr', 'nome_do_funil', 'Comercial', 'Comercial', null, 1),
  ('attr', 'nome_do_funil', 'Evento Colisão', 'Evento Colisão', null, 1),
  ('attr', 'funil_etapa', 'Em Fechamento', null, 'Em Fechamento', 2)
ON CONFLICT (chatwoot_type, chatwoot_key, chatwoot_value) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_mappings_config_updated_at
BEFORE UPDATE ON mappings_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();