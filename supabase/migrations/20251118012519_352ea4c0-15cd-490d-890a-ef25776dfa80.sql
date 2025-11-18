-- GRUPO A: User permissions já existe (validar apenas)
-- GRUPO B: Criar tabelas para cards finalizados
CREATE TABLE IF NOT EXISTS public.cards_ganhos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.cards_conversas(id) ON DELETE CASCADE,
  funil_id UUID REFERENCES public.funis(id),
  motivo TEXT,
  data_status TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cards_perdidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.cards_conversas(id) ON DELETE CASCADE,
  funil_id UUID REFERENCES public.funis(id),
  motivo TEXT,
  data_status TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- GRUPO F: Tabela para cores do kanban
CREATE TABLE IF NOT EXISTS public.kanban_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  coluna TEXT NOT NULL,
  cor TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, coluna)
);

-- Adicionar campo arquivado em cards_conversas se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'cards_conversas' 
                 AND column_name = 'arquivado') THEN
    ALTER TABLE public.cards_conversas ADD COLUMN arquivado BOOLEAN DEFAULT false;
  END IF;
END $$;

-- RLS policies para as novas tabelas
ALTER TABLE public.cards_ganhos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards_perdidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_colors ENABLE ROW LEVEL SECURITY;

-- Policies: Admins e usuários com acesso ao funil podem ver cards ganhos/perdidos
CREATE POLICY "Usuários podem ver cards ganhos de funis permitidos"
ON public.cards_ganhos
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.cards_conversas c
    WHERE c.id = cards_ganhos.card_id
    AND can_access_funil(auth.uid(), c.funil_id, false)
  )
);

CREATE POLICY "Usuários podem ver cards perdidos de funis permitidos"
ON public.cards_perdidos
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.cards_conversas c
    WHERE c.id = cards_perdidos.card_id
    AND can_access_funil(auth.uid(), c.funil_id, false)
  )
);

-- Policies para kanban_colors
CREATE POLICY "Usuários podem gerenciar suas cores"
ON public.kanban_colors
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_cards_ganhos_card_id ON public.cards_ganhos(card_id);
CREATE INDEX IF NOT EXISTS idx_cards_perdidos_card_id ON public.cards_perdidos(card_id);
CREATE INDEX IF NOT EXISTS idx_kanban_colors_user ON public.kanban_colors(user_id);