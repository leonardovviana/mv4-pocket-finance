-- Create storage bucket for avatars (compatível com variações do schema do storage)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'public'
    ) THEN
      EXECUTE 'INSERT INTO storage.buckets (id, name, public) VALUES (''avatars'', ''avatars'', true)';
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'is_public'
    ) THEN
      EXECUTE 'INSERT INTO storage.buckets (id, name, is_public) VALUES (''avatars'', ''avatars'', true)';
    ELSE
      EXECUTE 'INSERT INTO storage.buckets (id, name) VALUES (''avatars'', ''avatars'')';
    END IF;
  END IF;
END $$;

-- Allow users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');