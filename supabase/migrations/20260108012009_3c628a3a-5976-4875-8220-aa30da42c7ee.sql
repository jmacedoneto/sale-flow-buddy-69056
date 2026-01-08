-- Função para contar cards por funil (evita erro PGRST201 de ambiguidade)
CREATE OR REPLACE FUNCTION public.count_cards_by_funil(p_funil_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.cards_conversas
  WHERE funil_id = p_funil_id;
$$;