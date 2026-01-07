-- Remover a política antiga que verifica apenas 'admin'
DROP POLICY IF EXISTS "Admin pode deletar atividades" ON public.atividades_cards;