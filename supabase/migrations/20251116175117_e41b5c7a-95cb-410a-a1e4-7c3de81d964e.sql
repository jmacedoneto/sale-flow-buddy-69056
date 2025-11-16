-- Criar tabela para configurações de IA
CREATE TABLE IF NOT EXISTS public.ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_assistente_global text NOT NULL DEFAULT 'Você é um assistente de CRM especializado em vendas e atendimento. Ajude o usuário com informações sobre o sistema, métricas e análises.',
  prompt_resumo_comercial text NOT NULL DEFAULT 'Analise a conversa e forneça: 1) Probabilidade de fechamento (0-100%), 2) Principais objeções identificadas, 3) Próximos passos recomendados.',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.ai_config (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- RLS policies
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master pode ler ai_config"
  ON public.ai_config FOR SELECT
  USING (
    get_user_role((auth.jwt() ->> 'email'::text)) = 'master'::text 
    OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'::text
  );

CREATE POLICY "Master pode atualizar ai_config"
  ON public.ai_config FOR UPDATE
  USING (
    get_user_role((auth.jwt() ->> 'email'::text)) = 'master'::text 
    OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'::text
  );

CREATE POLICY "Master pode inserir ai_config"
  ON public.ai_config FOR INSERT
  WITH CHECK (
    get_user_role((auth.jwt() ->> 'email'::text)) = 'master'::text 
    OR (auth.jwt() ->> 'email'::text) = 'jmacedoneto1989@gmail.com'::text
  );