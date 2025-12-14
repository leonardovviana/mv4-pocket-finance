-- Service entries + expenses (cadastro)

-- Create enum for service keys
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

-- Entries table (flexível via metadata)
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

ALTER TABLE public.service_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own service_entries"
ON public.service_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own service_entries"
ON public.service_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own service_entries"
ON public.service_entries FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own service_entries"
ON public.service_entries FOR DELETE
USING (auth.uid() = user_id);

-- Expenses (despesas)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_kind') THEN
    CREATE TYPE public.expense_kind AS ENUM ('fixed', 'variable', 'provision');
  END IF;
END $$;

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

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own expenses"
ON public.expenses FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
ON public.expenses FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
ON public.expenses FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
ON public.expenses FOR DELETE
USING (auth.uid() = user_id);

-- Triggers for updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_service_entries_updated_at ON public.service_entries;
    CREATE TRIGGER update_service_entries_updated_at
      BEFORE UPDATE ON public.service_entries
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
    CREATE TRIGGER update_expenses_updated_at
      BEFORE UPDATE ON public.expenses
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
