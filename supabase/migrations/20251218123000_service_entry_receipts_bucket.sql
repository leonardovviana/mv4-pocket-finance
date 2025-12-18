-- Bucket e políticas para upload de comprovantes de recebimentos (service_entries)
-- Bucket privado. Upload por pasta do usuário (auth.uid())

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'service_entry_receipts') THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'public'
    ) THEN
      EXECUTE 'INSERT INTO storage.buckets (id, name, public) VALUES (''service_entry_receipts'', ''service_entry_receipts'', false)';
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'is_public'
    ) THEN
      EXECUTE 'INSERT INTO storage.buckets (id, name, is_public) VALUES (''service_entry_receipts'', ''service_entry_receipts'', false)';
    ELSE
      EXECUTE 'INSERT INTO storage.buckets (id, name) VALUES (''service_entry_receipts'', ''service_entry_receipts'')';
    END IF;
  END IF;
END $$;

DO $do$
BEGIN
  -- SELECT: admin ou dono
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Service receipts: select admin or own'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Service receipts: select admin or own"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'service_entry_receipts'
        AND (
          public.is_admin()
          OR auth.uid()::text = (storage.foldername(name))[1]
        )
      );
    $sql$;
  END IF;

  -- INSERT: somente dono (pasta 1 = auth.uid)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Service receipts: insert own'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Service receipts: insert own"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'service_entry_receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
    $sql$;
  END IF;

  -- UPDATE: somente dono
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Service receipts: update own'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Service receipts: update own"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'service_entry_receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = 'service_entry_receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
    $sql$;
  END IF;

  -- DELETE: somente dono
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Service receipts: delete own'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Service receipts: delete own"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'service_entry_receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
    $sql$;
  END IF;
END $do$;

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
