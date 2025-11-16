-- 1. Adicionar campos de status e pausa em cards_conversas
ALTER TABLE public.cards_conversas 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'ganho', 'perdido', 'pausado')),
ADD COLUMN IF NOT EXISTS pausado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS motivo_perda_id UUID,
ADD COLUMN IF NOT EXISTS valor_total DECIMAL(10, 2) DEFAULT 0;

-- 2. Criar tabela de motivos de perda
CREATE TABLE IF NOT EXISTS public.motivos_perda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Criar tabela de produtos
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  valor_padrao DECIMAL(10, 2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Criar tabela de relacionamento card-produtos
CREATE TABLE IF NOT EXISTS public.card_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.cards_conversas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  valor DECIMAL(10, 2) NOT NULL,
  quantidade INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(card_id, produto_id)
);

-- 5. Adicionar foreign key para motivo de perda
ALTER TABLE public.cards_conversas
ADD CONSTRAINT fk_motivo_perda 
FOREIGN KEY (motivo_perda_id) 
REFERENCES public.motivos_perda(id) 
ON DELETE SET NULL;

-- 6. Enable RLS nas novas tabelas
ALTER TABLE public.motivos_perda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_produtos ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies para motivos_perda
CREATE POLICY "Todos podem ler motivos de perda ativos"
ON public.motivos_perda FOR SELECT
USING (ativo = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem gerenciar motivos de perda"
ON public.motivos_perda FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- 8. RLS policies para produtos
CREATE POLICY "Todos podem ler produtos ativos"
ON public.produtos FOR SELECT
USING (ativo = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem gerenciar produtos"
ON public.produtos FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- 9. RLS policies para card_produtos
CREATE POLICY "Usuários podem ver produtos de cards que têm acesso"
ON public.card_produtos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cards_conversas c
    WHERE c.id = card_id
    AND (has_role(auth.uid(), 'admin') OR can_access_funil(auth.uid(), c.funil_id, false))
  )
);

CREATE POLICY "Usuários podem gerenciar produtos de cards que podem editar"
ON public.card_produtos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.cards_conversas c
    WHERE c.id = card_id
    AND (has_role(auth.uid(), 'admin') OR can_access_funil(auth.uid(), c.funil_id, true))
  )
);

-- 10. Trigger para atualizar updated_at
CREATE TRIGGER update_motivos_perda_updated_at
BEFORE UPDATE ON public.motivos_perda
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produtos_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Function para recalcular valor_total do card
CREATE OR REPLACE FUNCTION public.recalcular_valor_total_card()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.cards_conversas
  SET valor_total = (
    SELECT COALESCE(SUM(valor * quantidade), 0)
    FROM public.card_produtos
    WHERE card_id = COALESCE(NEW.card_id, OLD.card_id)
  )
  WHERE id = COALESCE(NEW.card_id, OLD.card_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 12. Trigger para recalcular valor_total quando produtos mudam
CREATE TRIGGER recalcular_valor_card_insert
AFTER INSERT ON public.card_produtos
FOR EACH ROW EXECUTE FUNCTION public.recalcular_valor_total_card();

CREATE TRIGGER recalcular_valor_card_update
AFTER UPDATE ON public.card_produtos
FOR EACH ROW EXECUTE FUNCTION public.recalcular_valor_total_card();

CREATE TRIGGER recalcular_valor_card_delete
AFTER DELETE ON public.card_produtos
FOR EACH ROW EXECUTE FUNCTION public.recalcular_valor_total_card();