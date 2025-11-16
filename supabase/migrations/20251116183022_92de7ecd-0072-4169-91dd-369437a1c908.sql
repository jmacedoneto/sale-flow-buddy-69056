-- Adicionar colunas de permissões granulares faltantes em users_crm
ALTER TABLE public.users_crm 
ADD COLUMN IF NOT EXISTS mover_etapa BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gerenciar_usuarios BOOLEAN DEFAULT false;

-- Atualizar permissões para admin ter todas as permissões
UPDATE public.users_crm
SET 
  criar_card = true,
  editar_card = true,
  deletar_card = true,
  mover_etapa = true,
  edit_funil = true,
  edit_etapas = true,
  ver_relatorios = true,
  gerenciar_usuarios = true
WHERE role = 'master' OR email = 'jmacedoneto1989@gmail.com';

-- Comentário: Permissões granulares para controle fino de acesso por usuário