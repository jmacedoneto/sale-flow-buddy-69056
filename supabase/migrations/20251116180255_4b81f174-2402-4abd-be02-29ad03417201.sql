-- Adicionar colunas necessárias em atividades_cards
ALTER TABLE public.atividades_cards
ADD COLUMN IF NOT EXISTS observacao text,
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida', 'postergada')),
ADD COLUMN IF NOT EXISTS data_conclusao timestamp with time zone,
ADD COLUMN IF NOT EXISTS data_prevista date;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_atividades_user_id ON public.atividades_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_atividades_status ON public.atividades_cards(status);

-- Atualizar RLS policies para filtrar por usuário
DROP POLICY IF EXISTS "Agent pode ler atividades de seus cards" ON public.atividades_cards;
DROP POLICY IF EXISTS "Manager pode ler atividades de cards do funil Comercial" ON public.atividades_cards;
DROP POLICY IF EXISTS "Viewer pode ler todas as atividades" ON public.atividades_cards;

-- Usuários normais veem apenas suas atividades
CREATE POLICY "Usuários veem suas próprias atividades"
ON public.atividades_cards
FOR SELECT
USING (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master'::text
  OR user_id = auth.uid()
);

-- Usuários podem atualizar suas próprias atividades
CREATE POLICY "Usuários podem atualizar suas atividades"
ON public.atividades_cards
FOR UPDATE
USING (
  get_user_role((auth.jwt() ->> 'email'::text)) = 'master'::text
  OR user_id = auth.uid()
);

-- Criar função para postergar atividade para próximo dia útil
CREATE OR REPLACE FUNCTION public.proximo_dia_util(data_base date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE plpgsql
AS $$
DECLARE
  proxima_data date;
  dia_semana int;
BEGIN
  proxima_data := data_base + interval '1 day';
  dia_semana := EXTRACT(DOW FROM proxima_data);
  
  -- Se cair no sábado (6), adicionar 2 dias
  IF dia_semana = 6 THEN
    proxima_data := proxima_data + interval '2 days';
  -- Se cair no domingo (0), adicionar 1 dia
  ELSIF dia_semana = 0 THEN
    proxima_data := proxima_data + interval '1 day';
  END IF;
  
  RETURN proxima_data;
END;
$$;