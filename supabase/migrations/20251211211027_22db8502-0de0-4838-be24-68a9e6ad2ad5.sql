-- Trigger para sincronizar users_crm.role → user_roles
CREATE OR REPLACE FUNCTION public.sync_user_role_to_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove roles antigas do usuário
  DELETE FROM public.user_roles WHERE user_id = NEW.id;
  
  -- Mapeia 'master' → 'admin', outros mantém ou default 'agent'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.role = 'master' THEN 'admin'::app_role
      WHEN NEW.role = 'admin' THEN 'admin'::app_role
      WHEN NEW.role = 'manager' THEN 'manager'::app_role
      WHEN NEW.role = 'agent' THEN 'agent'::app_role
      WHEN NEW.role = 'viewer' THEN 'viewer'::app_role
      ELSE 'agent'::app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop trigger se existir e recriar
DROP TRIGGER IF EXISTS trg_sync_role ON public.users_crm;

CREATE TRIGGER trg_sync_role
AFTER INSERT OR UPDATE OF role ON public.users_crm
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role_to_user_roles();

-- Sincronizar usuários existentes
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id,
  CASE 
    WHEN role = 'master' THEN 'admin'::app_role
    WHEN role = 'admin' THEN 'admin'::app_role
    WHEN role = 'manager' THEN 'manager'::app_role
    WHEN role = 'agent' THEN 'agent'::app_role
    WHEN role = 'viewer' THEN 'viewer'::app_role
    ELSE 'agent'::app_role
  END
FROM public.users_crm
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id, role) DO NOTHING;