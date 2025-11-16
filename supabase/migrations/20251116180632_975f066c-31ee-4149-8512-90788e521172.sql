-- Corrigir recursão infinita nas RLS policies de user_roles e user_funil_access
-- O problema é que as policies estão consultando user_roles dentro de si mesmas

-- 1. Remover policies problemáticas de user_roles
DROP POLICY IF EXISTS "Admins podem gerenciar todos os roles" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios roles" ON public.user_roles;

-- 2. Criar policies corretas usando has_role que já existe e é SECURITY DEFINER
CREATE POLICY "Admins podem gerenciar todos os roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem ver seus próprios roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- 3. Corrigir policies de user_funil_access
DROP POLICY IF EXISTS "Admins podem gerenciar acessos" ON public.user_funil_access;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios acessos" ON public.user_funil_access;

CREATE POLICY "Admins podem gerenciar acessos"
ON public.user_funil_access
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuários podem ver seus próprios acessos"
ON public.user_funil_access
FOR SELECT
USING (user_id = auth.uid());