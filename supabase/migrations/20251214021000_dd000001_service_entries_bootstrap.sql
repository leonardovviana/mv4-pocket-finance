-- Bootstrap for service_entries table on remote (fix PGRST205 schema cache)

-- Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_key') THEN
    CREATE TYPE public.service_key AS ENUM (
      'melhores_do_ano',
      'gestao_midias',
      'premio_excelencia',
      'carro_de_som',
      'revista_factus',
      'revista_saude',
      'servicos_variados'
    );
  END IF;
END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.service_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service public.service_key NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC(12,2),
  entry_date DATE,
  status TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_entries_user_id_idx ON public.service_entries(user_id);
CREATE INDEX IF NOT EXISTS service_entries_service_idx ON public.service_entries(service);
CREATE INDEX IF NOT EXISTS service_entries_entry_date_idx ON public.service_entries(entry_date);

-- Grants (needed for PostgREST schema cache visibility)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.service_entries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.service_entries TO authenticated;

-- RLS
ALTER TABLE public.service_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_entries'
      AND policyname = 'Users can view own service_entries'
  ) THEN
    CREATE POLICY "Users can view own service_entries"
    ON public.service_entries FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_entries'
      AND policyname = 'Users can insert own service_entries'
  ) THEN
    CREATE POLICY "Users can insert own service_entries"
    ON public.service_entries FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_entries'
      AND policyname = 'Users can update own service_entries'
  ) THEN
    CREATE POLICY "Users can update own service_entries"
    ON public.service_entries FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_entries'
      AND policyname = 'Users can delete own service_entries'
  ) THEN
    CREATE POLICY "Users can delete own service_entries"
    ON public.service_entries FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger (if helper exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_service_entries_updated_at ON public.service_entries;
    CREATE TRIGGER update_service_entries_updated_at
      BEFORE UPDATE ON public.service_entries
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
