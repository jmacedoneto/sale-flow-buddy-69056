-- ============================================
-- FASE 1: POLICIES RLS SUPER-ADMIN (SOMENTE NOVAS)
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