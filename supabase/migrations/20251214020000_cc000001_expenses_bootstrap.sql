-- Bootstrap for expenses table on remote (fix PGRST205 schema cache)

-- Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_kind') THEN
    CREATE TYPE public.expense_kind AS ENUM ('fixed', 'variable', 'provision');
  END IF;
END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.expense_kind NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_day SMALLINT,
  paid BOOLEAN NOT NULL DEFAULT false,
  cost_center TEXT,
  payment_method TEXT,
  installments INTEGER,
  recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_rule TEXT,
  receipt_url TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS expenses_kind_idx ON public.expenses(kind);
CREATE INDEX IF NOT EXISTS expenses_expense_date_idx ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS expenses_paid_idx ON public.expenses(paid);
CREATE INDEX IF NOT EXISTS expenses_payment_method_idx ON public.expenses(payment_method);

-- Grants (needed for PostgREST schema cache visibility)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.expenses TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expenses TO authenticated;

-- RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'expenses'
      AND policyname = 'Users can view own expenses'
  ) THEN
    CREATE POLICY "Users can view own expenses"
    ON public.expenses FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'expenses'
      AND policyname = 'Users can insert own expenses'
  ) THEN
    CREATE POLICY "Users can insert own expenses"
    ON public.expenses FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'expenses'
      AND policyname = 'Users can update own expenses'
  ) THEN
    CREATE POLICY "Users can update own expenses"
    ON public.expenses FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'expenses'
      AND policyname = 'Users can delete own expenses'
  ) THEN
    CREATE POLICY "Users can delete own expenses"
    ON public.expenses FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger (if helper exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
    CREATE TRIGGER update_expenses_updated_at
      BEFORE UPDATE ON public.expenses
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
