-- Adicionar constraint UNIQUE em chatwoot_conversa_id para suportar upsert
ALTER TABLE public.cards_conversas 
ADD CONSTRAINT uq_chatwoot_conversa_id UNIQUE (chatwoot_conversa_id);