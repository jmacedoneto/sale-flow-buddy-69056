-- FASE 1: Batch Update - Banco de Dados

-- 1.1: Adicionar avatar_url aos usuários
ALTER TABLE public.users_crm ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 1.2: Adicionar telefone_lead aos cards
ALTER TABLE public.cards_conversas ADD COLUMN IF NOT EXISTS telefone_lead TEXT;

-- 1.3: Criar bucket público para avatares
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 1.4: RLS Policies para Storage - Leitura pública
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 1.5: RLS Policies para Storage - Upload próprio (pasta com uuid do usuário)
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 1.6: RLS Policies para Storage - Update próprio
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 1.7: RLS Policies para Storage - Delete próprio
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);