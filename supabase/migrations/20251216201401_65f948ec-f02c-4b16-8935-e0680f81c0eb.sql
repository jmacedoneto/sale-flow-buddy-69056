-- Adiciona coluna para permissão de ver cards de outros usuários
ALTER TABLE public.users_crm 
ADD COLUMN IF NOT EXISTS ver_cards_outros boolean DEFAULT false;

COMMENT ON COLUMN public.users_crm.ver_cards_outros IS 
'Se true, o usuário pode ver cards de outros agentes além dos seus';