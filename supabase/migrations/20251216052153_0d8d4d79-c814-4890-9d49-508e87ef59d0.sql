-- Fase 1: Atividades Avulsas - card_id nullable
ALTER TABLE public.atividades_cards 
ALTER COLUMN card_id DROP NOT NULL;

-- Adicionar campo para contato do Chatwoot (atividades avulsas/notas)
ALTER TABLE public.atividades_cards 
ADD COLUMN IF NOT EXISTS chatwoot_contact_id INTEGER;

-- Fase 2: Avatares nos cards
ALTER TABLE public.cards_conversas 
ADD COLUMN IF NOT EXISTS avatar_lead_url TEXT;

ALTER TABLE public.cards_conversas 
ADD COLUMN IF NOT EXISTS avatar_agente_url TEXT;

-- Atualizar RLS para atividades sem card (avulsas)
DROP POLICY IF EXISTS "Usuários veem suas próprias atividades" ON public.atividades_cards;
CREATE POLICY "Usuários veem suas próprias atividades" 
ON public.atividades_cards 
FOR SELECT 
USING (
  (get_user_role((auth.jwt() ->> 'email'::text)) = 'master'::text) 
  OR (user_id = auth.uid())
  OR (card_id IS NULL AND user_id = auth.uid())
);

-- Permitir inserção de atividades avulsas (sem card)
DROP POLICY IF EXISTS "Usuários autenticados podem inserir atividades" ON public.atividades_cards;
CREATE POLICY "Usuários autenticados podem inserir atividades" 
ON public.atividades_cards 
FOR INSERT 
WITH CHECK (
  (user_id IS NULL) 
  OR (user_id = auth.uid())
);