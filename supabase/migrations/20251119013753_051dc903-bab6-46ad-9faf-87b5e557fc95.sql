-- P4: Adicionar campo de cache para resumo IA
ALTER TABLE cards_conversas 
ADD COLUMN IF NOT EXISTS resumo_generated_at timestamp with time zone;

-- P6: Adicionar constraint UNIQUE para evitar produtos duplicados no mesmo card
ALTER TABLE card_produtos
ADD CONSTRAINT unique_card_produto UNIQUE (card_id, produto_id);