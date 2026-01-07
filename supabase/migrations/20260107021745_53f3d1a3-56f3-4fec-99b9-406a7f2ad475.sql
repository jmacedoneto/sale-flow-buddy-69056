-- Primeiro, remover a política atual que usa has_role (que verifica user_roles)
DROP POLICY IF EXISTS "Admin ou Master pode deletar atividades" ON public.atividades_cards;

-- Criar função security definer para verificar role na tabela users_crm
CREATE OR REPLACE FUNCTION public.has_crm_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users_crm
    WHERE id = _user_id
      AND role = _role
  )
$$;

-- Criar nova política que permite admin ou master deletar atividades
CREATE POLICY "Admin ou Master pode deletar atividades" 
ON public.atividades_cards 
FOR DELETE 
TO authenticated
USING (
  public.has_crm_role(auth.uid(), 'admin') 
  OR public.has_crm_role(auth.uid(), 'master')
);