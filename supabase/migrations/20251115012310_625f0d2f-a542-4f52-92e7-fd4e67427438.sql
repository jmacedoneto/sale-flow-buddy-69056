
-- Adicionar políticas RLS para role 'master' (super admin)
-- Master pode fazer tudo sem restrições

-- SELECT (ler todos os cards)
CREATE POLICY "Master pode ler todos os cards"
ON public.cards_conversas
FOR SELECT
TO authenticated
USING (get_user_role(auth.jwt() ->> 'email') = 'master');

-- INSERT (criar cards)
CREATE POLICY "Master pode inserir cards"
ON public.cards_conversas
FOR INSERT
TO authenticated
WITH CHECK (get_user_role(auth.jwt() ->> 'email') = 'master');

-- UPDATE (atualizar cards)
CREATE POLICY "Master pode atualizar todos os cards"
ON public.cards_conversas
FOR UPDATE
TO authenticated
USING (get_user_role(auth.jwt() ->> 'email') = 'master');

-- DELETE (deletar cards)
CREATE POLICY "Master pode deletar todos os cards"
ON public.cards_conversas
FOR DELETE
TO authenticated
USING (get_user_role(auth.jwt() ->> 'email') = 'master');

-- Permitir que service role (edge functions/webhooks) insira cards
CREATE POLICY "Service role pode inserir cards via webhooks"
ON public.cards_conversas
FOR INSERT
TO service_role
WITH CHECK (true);

-- Permitir que service role atualize cards via webhooks
CREATE POLICY "Service role pode atualizar cards via webhooks"
ON public.cards_conversas
FOR UPDATE
TO service_role
USING (true);

-- Comentário para documentar
COMMENT ON POLICY "Master pode ler todos os cards" ON public.cards_conversas IS 
'Master (super admin) tem acesso total de leitura a todos os cards do sistema';

COMMENT ON POLICY "Service role pode inserir cards via webhooks" ON public.cards_conversas IS 
'Permite que edge functions (dispatcher-multi, sync-chatwoot, etc) criem cards via webhooks do Chatwoot';
