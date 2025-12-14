-- Bucket e políticas para upload de comprovantes de despesas
-- Mantém o bucket privado e permite acesso apenas ao dono do arquivo (owner = auth.uid())

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'expense_receipts') THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'public'
    ) THEN
      EXECUTE 'INSERT INTO storage.buckets (id, name, public) VALUES (''expense_receipts'', ''expense_receipts'', false)';
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'is_public'
    ) THEN
      EXECUTE 'INSERT INTO storage.buckets (id, name, is_public) VALUES (''expense_receipts'', ''expense_receipts'', false)';
    ELSE
      EXECUTE 'INSERT INTO storage.buckets (id, name) VALUES (''expense_receipts'', ''expense_receipts'')';
    END IF;
  END IF;
END $$;

-- Policies (RLS) em storage.objects
-- Observação: Supabase Storage geralmente habilita RLS em storage.objects.

DO $do$
BEGIN
  -- SELECT (ler): somente dono
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Expense receipts: select own'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Expense receipts: select own"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'expense_receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
    $sql$;
  END IF;

  -- INSERT (upload): somente dono
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Expense receipts: insert own'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Expense receipts: insert own"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'expense_receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
    $sql$;
  END IF;

  -- UPDATE: somente dono
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Expense receipts: update own'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Expense receipts: update own"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'expense_receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = 'expense_receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
    $sql$;
  END IF;

  -- DELETE: somente dono
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Expense receipts: delete own'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Expense receipts: delete own"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'expense_receipts'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
    $sql$;
  END IF;
END $do$;
