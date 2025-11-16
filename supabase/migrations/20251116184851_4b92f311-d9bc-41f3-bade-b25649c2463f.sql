-- 1. TEMPLATES DE MENSAGENS RÁPIDAS
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  atalho TEXT, -- Exemplo: /oi, /preco
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates"
  ON public.message_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates"
  ON public.message_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.message_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.message_templates FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. AUDIT TRAIL (Histórico de Mudanças)
CREATE TABLE public.audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.cards_conversas(id) ON DELETE CASCADE,
  user_id UUID,
  campo_alterado TEXT NOT NULL, -- funil_id, etapa_id, valor_total, etc
  valor_anterior TEXT,
  valor_novo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit trail"
  ON public.audit_trail FOR SELECT
  USING (true);

CREATE INDEX idx_audit_trail_card_id ON public.audit_trail(card_id);
CREATE INDEX idx_audit_trail_created_at ON public.audit_trail(created_at DESC);

-- 3. Adicionar campo SLA aos cards
ALTER TABLE public.cards_conversas
ADD COLUMN sla_vencimento TIMESTAMP WITH TIME ZONE;

-- 4. Trigger para registrar mudanças no audit trail
CREATE OR REPLACE FUNCTION public.registrar_audit_trail()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id_var UUID;
BEGIN
  user_id_var := auth.uid();

  -- Verificar mudanças em campos críticos
  IF OLD.funil_id IS DISTINCT FROM NEW.funil_id THEN
    INSERT INTO public.audit_trail (card_id, user_id, campo_alterado, valor_anterior, valor_novo)
    VALUES (NEW.id, user_id_var, 'funil_id', OLD.funil_id::TEXT, NEW.funil_id::TEXT);
  END IF;

  IF OLD.etapa_id IS DISTINCT FROM NEW.etapa_id THEN
    INSERT INTO public.audit_trail (card_id, user_id, campo_alterado, valor_anterior, valor_novo)
    VALUES (NEW.id, user_id_var, 'etapa_id', OLD.etapa_id::TEXT, NEW.etapa_id::TEXT);
  END IF;

  IF OLD.valor_total IS DISTINCT FROM NEW.valor_total THEN
    INSERT INTO public.audit_trail (card_id, user_id, campo_alterado, valor_anterior, valor_novo)
    VALUES (NEW.id, user_id_var, 'valor_total', OLD.valor_total::TEXT, NEW.valor_total::TEXT);
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_trail (card_id, user_id, campo_alterado, valor_anterior, valor_novo)
    VALUES (NEW.id, user_id_var, 'status', OLD.status, NEW.status);
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.audit_trail (card_id, user_id, campo_alterado, valor_anterior, valor_novo)
    VALUES (NEW.id, user_id_var, 'assigned_to', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_audit_trail
  AFTER UPDATE ON public.cards_conversas
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_audit_trail();