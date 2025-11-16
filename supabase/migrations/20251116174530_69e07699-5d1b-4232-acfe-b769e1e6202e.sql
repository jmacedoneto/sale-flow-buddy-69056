-- Adicionar campo cor nas etapas para personalização visual
ALTER TABLE public.etapas 
ADD COLUMN cor TEXT DEFAULT '#3b82f6';

-- Comentário explicativo
COMMENT ON COLUMN public.etapas.cor IS 'Cor hexadecimal da etapa para visualização no Kanban';

-- Atualizar etapas existentes com cores padrão variadas
UPDATE public.etapas 
SET cor = CASE 
  WHEN ordem = 1 THEN '#3b82f6'  -- azul
  WHEN ordem = 2 THEN '#8b5cf6'  -- roxo
  WHEN ordem = 3 THEN '#ec4899'  -- rosa
  WHEN ordem = 4 THEN '#f59e0b'  -- amarelo
  WHEN ordem = 5 THEN '#10b981'  -- verde
  ELSE '#6b7280'  -- cinza
END;