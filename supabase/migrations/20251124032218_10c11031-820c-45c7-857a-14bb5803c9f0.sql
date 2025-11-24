-- Migração para sincronizar sistema de permissões
-- Força SSOT em user_roles ao invés de users_crm

-- 1. Inserir explicitamente admins principais
INSERT INTO user_roles (user_id, role)
VALUES 
  ('46d5b7f1-fc2f-45c7-8561-99a852922ebc', 'admin'),
  ('7eadfaf5-d815-47fc-80ed-edb565855b13', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Migrar todos os usuários ativos de users_crm para user_roles
INSERT INTO user_roles (user_id, role)
SELECT 
  id,
  CASE 
    WHEN role = 'master' THEN 'admin'::app_role
    WHEN role = 'admin' THEN 'admin'::app_role
    WHEN role = 'manager' THEN 'manager'::app_role
    WHEN role = 'agent' THEN 'agent'::app_role
    ELSE 'viewer'::app_role
  END as role
FROM users_crm
WHERE approved = true 
  AND ativo = true
  AND role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;