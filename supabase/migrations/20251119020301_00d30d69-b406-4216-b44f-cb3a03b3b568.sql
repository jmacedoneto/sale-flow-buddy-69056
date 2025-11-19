-- GRUPO D: Modelo de Usuários - Estado de aprovação e estrutura

-- 1. Adicionar campo status em users_crm para controlar aprovação
ALTER TABLE public.users_crm 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'blocked'));

-- 2. Atualizar usuários existentes aprovados para status 'approved'
UPDATE public.users_crm 
SET status = 'approved' 
WHERE approved = true;

-- 3. Criar índice para otimizar queries por status
CREATE INDEX IF NOT EXISTS idx_users_crm_status ON public.users_crm(status);

-- 4. Garantir que admin possui acesso completo (função auxiliar já existe: has_role)
-- Políticas RLS já implementadas corretamente para user_roles e user_funil_access

-- 5. Comentários explicativos
COMMENT ON COLUMN public.users_crm.status IS 'Status de aprovação do usuário: pending (aguardando aprovação), approved (aprovado), blocked (bloqueado)';
