-- ====================================
-- ONDA 1: FUNDAÇÕES DE PERMISSÕES
-- ====================================

-- 1. Criar ENUM para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'agent', 'viewer');

-- 2. Criar tabela user_roles (modelo robusto de permissões)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_roles
-- Todos podem ver seus próprios roles
CREATE POLICY "Usuários podem ver seus próprios roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins podem gerenciar todos os roles
CREATE POLICY "Admins podem gerenciar todos os roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 3. Criar tabela user_funil_access (controle granular por funil)
CREATE TABLE public.user_funil_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  funil_id UUID NOT NULL REFERENCES public.funis(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, funil_id)
);

-- Habilitar RLS
ALTER TABLE public.user_funil_access ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_funil_access
-- Usuários podem ver seus próprios acessos
CREATE POLICY "Usuários podem ver seus próprios acessos"
ON public.user_funil_access
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins podem gerenciar todos os acessos
CREATE POLICY "Admins podem gerenciar acessos"
ON public.user_funil_access
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 4. Criar função has_role() com SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Criar função para verificar acesso a funil
CREATE OR REPLACE FUNCTION public.can_access_funil(_user_id UUID, _funil_id UUID, _require_edit BOOLEAN DEFAULT false)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_funil_access
    WHERE user_id = _user_id
      AND funil_id = _funil_id
      AND (
        (_require_edit = false AND can_view = true) OR
        (_require_edit = true AND can_edit = true)
      )
  ) OR public.has_role(_user_id, 'admin')
$$;

-- 6. MIGRAR DADOS de users_crm.role → user_roles
-- Mapear: master → admin, outros roles mantém
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id,
  CASE 
    WHEN role = 'master' THEN 'admin'::app_role
    WHEN role = 'admin' THEN 'admin'::app_role
    WHEN role = 'manager' THEN 'manager'::app_role
    WHEN role = 'agent' THEN 'agent'::app_role
    ELSE 'viewer'::app_role
  END
FROM public.users_crm
WHERE id IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 7. Dar acesso total aos admins em todos os funis existentes
INSERT INTO public.user_funil_access (user_id, funil_id, can_view, can_edit)
SELECT ur.user_id, f.id, true, true
FROM public.user_roles ur
CROSS JOIN public.funis f
WHERE ur.role = 'admin'
ON CONFLICT (user_id, funil_id) DO UPDATE
SET can_view = true, can_edit = true;

-- 8. REESCREVER RLS de funis (baseado em user_funil_access)
DROP POLICY IF EXISTS "Todos podem ler funis" ON public.funis;
DROP POLICY IF EXISTS "Usuários aprovados com permissão podem inserir funis" ON public.funis;
DROP POLICY IF EXISTS "Usuários aprovados com permissão podem atualizar funis" ON public.funis;
DROP POLICY IF EXISTS "Usuários aprovados com permissão podem deletar funis" ON public.funis;

-- SELECT: usuário pode ver funis que tem acesso OU se for admin
CREATE POLICY "Usuários podem ver funis permitidos"
ON public.funis
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.can_access_funil(auth.uid(), id, false)
);

-- INSERT: apenas admins
CREATE POLICY "Admins podem criar funis"
ON public.funis
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- UPDATE: admins ou quem tem can_edit no funil
CREATE POLICY "Admins e editores podem atualizar funis"
ON public.funis
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.can_access_funil(auth.uid(), id, true)
);

-- DELETE: apenas admins
CREATE POLICY "Admins podem deletar funis"
ON public.funis
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 9. REESCREVER RLS de etapas
DROP POLICY IF EXISTS "Todos podem ler etapas" ON public.etapas;
DROP POLICY IF EXISTS "Usuários aprovados com permissão podem inserir etapas" ON public.etapas;
DROP POLICY IF EXISTS "Usuários aprovados com permissão podem atualizar etapas" ON public.etapas;
DROP POLICY IF EXISTS "Usuários aprovados com permissão podem deletar etapas" ON public.etapas;

-- SELECT: pode ver se pode ver o funil
CREATE POLICY "Usuários podem ver etapas de funis permitidos"
ON public.etapas
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.can_access_funil(auth.uid(), funil_id, false)
);

-- INSERT/UPDATE/DELETE: admins ou quem tem can_edit no funil
CREATE POLICY "Admins e editores podem criar etapas"
ON public.etapas
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.can_access_funil(auth.uid(), funil_id, true)
);

CREATE POLICY "Admins e editores podem atualizar etapas"
ON public.etapas
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.can_access_funil(auth.uid(), funil_id, true)
);

CREATE POLICY "Admins e editores podem deletar etapas"
ON public.etapas
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.can_access_funil(auth.uid(), funil_id, true)
);

-- 10. REESCREVER RLS de cards_conversas (manter Master/Admin antigas + nova lógica)
-- Manter policies de service_role
-- Substituir as antigas baseadas em get_user_role

DROP POLICY IF EXISTS "Admin pode ler todos os cards" ON public.cards_conversas;
DROP POLICY IF EXISTS "Manager pode ler cards do funil Comercial" ON public.cards_conversas;
DROP POLICY IF EXISTS "Agent pode ler seus próprios cards" ON public.cards_conversas;
DROP POLICY IF EXISTS "Viewer pode ler todos os cards" ON public.cards_conversas;
DROP POLICY IF EXISTS "Admin pode inserir cards" ON public.cards_conversas;
DROP POLICY IF EXISTS "Manager pode inserir cards do funil Comercial" ON public.cards_conversas;
DROP POLICY IF EXISTS "Agent pode inserir seus próprios cards" ON public.cards_conversas;
DROP POLICY IF EXISTS "Admin pode atualizar todos os cards" ON public.cards_conversas;
DROP POLICY IF EXISTS "Manager pode atualizar cards do funil Comercial" ON public.cards_conversas;
DROP POLICY IF EXISTS "Agent pode atualizar seus próprios cards" ON public.cards_conversas;
DROP POLICY IF EXISTS "Admin pode deletar cards" ON public.cards_conversas;

-- SELECT: pode ver cards de funis que tem acesso
CREATE POLICY "Usuários podem ver cards de funis permitidos"
ON public.cards_conversas
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.can_access_funil(auth.uid(), funil_id, false)
);

-- INSERT: pode criar em funis que tem can_edit
CREATE POLICY "Usuários podem criar cards em funis permitidos"
ON public.cards_conversas
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.can_access_funil(auth.uid(), funil_id, true)
);

-- UPDATE: pode editar cards de funis que tem can_edit
CREATE POLICY "Usuários podem atualizar cards de funis permitidos"
ON public.cards_conversas
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.can_access_funil(auth.uid(), funil_id, true)
);

-- DELETE: apenas admins
CREATE POLICY "Admins podem deletar cards"
ON public.cards_conversas
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 11. Adicionar comentário na coluna role de users_crm (marcar como legacy)
COMMENT ON COLUMN public.users_crm.role IS 'LEGACY - Migrado para user_roles. Manter para compatibilidade temporária.';

-- 12. Criar trigger para atualizar updated_at em user_roles e user_funil_access
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_funil_access_updated_at
BEFORE UPDATE ON public.user_funil_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();