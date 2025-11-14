-- ============================================
-- FASE 0: LIBERAR LOGIN SUPER ADMIN
-- ============================================

-- 0.1: Atualizar role no auth.users (JWT)
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"super-admin"'::jsonb
)
WHERE email = 'jmacedoneto1989@gmail.com';

-- 0.2: Atualizar registro em users_crm para aprovado e master
UPDATE public.users_crm
SET 
  approved = true,
  role = 'master',
  ativo = true,
  edit_funil = true,
  edit_etapas = true,
  criar_card = true,
  editar_card = true,
  deletar_card = true,
  ver_relatorios = true,
  nome = COALESCE(nome, 'Administrador Master'),
  updated_at = now()
WHERE email = 'jmacedoneto1989@gmail.com';

-- ============================================
-- FASE 1: POLICIES RLS SUPER-ADMIN
-- ============================================

-- 1.1: Policy para webhooks_config
DROP POLICY IF EXISTS "Super admin full access webhooks" ON public.webhooks_config;
CREATE POLICY "Super admin full access webhooks"
ON public.webhooks_config
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email')::text = 'jmacedoneto1989@gmail.com' OR
  (auth.jwt() ->> 'role')::text IN ('super-admin', 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.users_crm 
    WHERE id = auth.uid() 
    AND role = 'master' 
    AND approved = true
  )
)
WITH CHECK (
  (auth.jwt() ->> 'email')::text = 'jmacedoneto1989@gmail.com' OR
  (auth.jwt() ->> 'role')::text IN ('super-admin', 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.users_crm 
    WHERE id = auth.uid() 
    AND role = 'master' 
    AND approved = true
  )
);

-- 1.2: Policy para mappings_config
DROP POLICY IF EXISTS "Super admin full access mappings" ON public.mappings_config;
CREATE POLICY "Super admin full access mappings"
ON public.mappings_config
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email')::text = 'jmacedoneto1989@gmail.com' OR
  (auth.jwt() ->> 'role')::text IN ('super-admin', 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.users_crm 
    WHERE id = auth.uid() 
    AND role = 'master' 
    AND approved = true
  )
)
WITH CHECK (
  (auth.jwt() ->> 'email')::text = 'jmacedoneto1989@gmail.com' OR
  (auth.jwt() ->> 'role')::text IN ('super-admin', 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.users_crm 
    WHERE id = auth.uid() 
    AND role = 'master' 
    AND approved = true
  )
);

-- 1.3: Policy para webhook_sync_logs
DROP POLICY IF EXISTS "Super admin can view all webhook logs" ON public.webhook_sync_logs;
CREATE POLICY "Super admin can view all webhook logs"
ON public.webhook_sync_logs
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email')::text = 'jmacedoneto1989@gmail.com' OR
  (auth.jwt() ->> 'role')::text IN ('super-admin', 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.users_crm 
    WHERE id = auth.uid() 
    AND role = 'master' 
    AND approved = true
  )
);

-- 1.4: Policy para integracao_chatwoot
DROP POLICY IF EXISTS "Master/Super pode ler config Chatwoot" ON public.integracao_chatwoot;
DROP POLICY IF EXISTS "Master/Super pode inserir config Chatwoot" ON public.integracao_chatwoot;
DROP POLICY IF EXISTS "Master/Super pode atualizar config Chatwoot" ON public.integracao_chatwoot;
DROP POLICY IF EXISTS "Master/Super pode deletar config Chatwoot" ON public.integracao_chatwoot;

CREATE POLICY "Super admin full access chatwoot"
ON public.integracao_chatwoot
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email')::text = 'jmacedoneto1989@gmail.com' OR
  (auth.jwt() ->> 'role')::text IN ('super-admin', 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.users_crm 
    WHERE id = auth.uid() 
    AND role = 'master' 
    AND approved = true
  )
)
WITH CHECK (
  (auth.jwt() ->> 'email')::text = 'jmacedoneto1989@gmail.com' OR
  (auth.jwt() ->> 'role')::text IN ('super-admin', 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.users_crm 
    WHERE id = auth.uid() 
    AND role = 'master' 
    AND approved = true
  )
);