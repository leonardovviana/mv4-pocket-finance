-- Cash balances (manual user-updated)

CREATE TABLE IF NOT EXISTS public.cash_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account TEXT NOT NULL,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cash_balances_user_account_unique UNIQUE (user_id, account),
  CONSTRAINT cash_balances_account_allowed CHECK (account IN (
    'conta_ton',
    'conta_stone',
    'conta_cora',
    'conta_pagbank',
    'cheque',
    'dinheiro'
  ))
);

CREATE INDEX IF NOT EXISTS cash_balances_user_id_idx ON public.cash_balances(user_id);
CREATE INDEX IF NOT EXISTS cash_balances_account_idx ON public.cash_balances(account);

-- Grants (PostgREST visibility)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.cash_balances TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cash_balances TO authenticated;

-- RLS
ALTER TABLE public.cash_balances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cash_balances'
      AND policyname = 'Users can view own cash balances'
  ) THEN
    CREATE POLICY "Users can view own cash balances"
    ON public.cash_balances FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cash_balances'
      AND policyname = 'Users can insert own cash balances'
  ) THEN
    CREATE POLICY "Users can insert own cash balances"
    ON public.cash_balances FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cash_balances'
      AND policyname = 'Users can update own cash balances'
  ) THEN
    CREATE POLICY "Users can update own cash balances"
    ON public.cash_balances FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cash_balances'
      AND policyname = 'Users can delete own cash balances'
  ) THEN
    CREATE POLICY "Users can delete own cash balances"
    ON public.cash_balances FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger (if helper exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_cash_balances_updated_at ON public.cash_balances;
    CREATE TRIGGER update_cash_balances_updated_at
      BEFORE UPDATE ON public.cash_balances
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
