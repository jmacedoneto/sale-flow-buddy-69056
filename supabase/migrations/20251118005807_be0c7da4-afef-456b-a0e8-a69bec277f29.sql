-- Corrigir política RLS para atividades_cards
-- Problema: INSERT bloqueado porque não passa user_id

-- Remover política restritiva atual
DROP POLICY IF EXISTS "Admin/Manager/Agent podem inserir atividades" ON atividades_cards;

-- Criar nova política mais flexível
CREATE POLICY "Usuários autenticados podem inserir atividades"
ON atividades_cards
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permite se usuário está autenticado E
  -- (não tem user_id OU user_id corresponde ao usuário logado)
  (user_id IS NULL OR user_id = auth.uid())
);