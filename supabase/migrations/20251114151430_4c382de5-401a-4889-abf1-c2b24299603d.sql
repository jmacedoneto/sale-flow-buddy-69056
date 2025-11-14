-- FASE 1.2: Ajustar policies RLS para super-admin

-- Policy para webhooks_config
DROP POLICY IF EXISTS "Super admin full access webhooks" ON public.webhooks_config;

CREATE POLICY "Super admin full access webhooks"
ON public.webhooks_config
FOR ALL
TO public
USING (
  (auth.jwt()->>'email' = 'jmacedoneto1989@gmail.com') OR
  (auth.jwt()->>'role' = 'super-admin') OR
  (auth.jwt()->>'role' = 'super_admin')
)
WITH CHECK (
  (auth.jwt()->>'email' = 'jmacedoneto1989@gmail.com') OR
  (auth.jwt()->>'role' = 'super-admin') OR
  (auth.jwt()->>'role' = 'super_admin')
);

-- Policy para mappings_config
DROP POLICY IF EXISTS "Super admin full access mappings" ON public.mappings_config;

CREATE POLICY "Super admin full access mappings"
ON public.mappings_config
FOR ALL
TO public
USING (
  (auth.jwt()->>'email' = 'jmacedoneto1989@gmail.com') OR
  (auth.jwt()->>'role' = 'super-admin') OR
  (auth.jwt()->>'role' = 'super_admin')
)
WITH CHECK (
  (auth.jwt()->>'email' = 'jmacedoneto1989@gmail.com') OR
  (auth.jwt()->>'role' = 'super-admin') OR
  (auth.jwt()->>'role' = 'super_admin')
);

-- Policy para webhook_sync_logs
DROP POLICY IF EXISTS "Super admin can view all webhook logs" ON public.webhook_sync_logs;

CREATE POLICY "Super admin can view all webhook logs"
ON public.webhook_sync_logs
FOR SELECT
TO public
USING (
  (auth.jwt()->>'email' = 'jmacedoneto1989@gmail.com') OR
  (auth.jwt()->>'role' = 'super-admin') OR
  (auth.jwt()->>'role' = 'super_admin')
);