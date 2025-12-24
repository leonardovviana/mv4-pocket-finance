-- Repair migration: recreate accounts_payable if it was deleted manually

DO $do$
BEGIN
  IF to_regclass('public.accounts_payable') IS NULL THEN
    CREATE TABLE public.accounts_payable (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      created_by uuid not null default auth.uid(),

      vendor text not null,
      description text null,
      amount numeric(12, 2) not null,
      due_date date not null,

      status text not null default 'open' check (status in ('open','paid','canceled')),
      paid_at timestamptz null,

      payment_method text null,
      notes text null,
      metadata jsonb not null default '{}'::jsonb
    );

    CREATE INDEX IF NOT EXISTS accounts_payable_due_date_idx ON public.accounts_payable (due_date);
    CREATE INDEX IF NOT EXISTS accounts_payable_status_idx ON public.accounts_payable (status);

    ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

    -- Admin-only access (match app expectations)
    DROP POLICY IF EXISTS accounts_payable_select_admin ON public.accounts_payable;
    DROP POLICY IF EXISTS accounts_payable_insert_admin ON public.accounts_payable;
    DROP POLICY IF EXISTS accounts_payable_update_admin ON public.accounts_payable;
    DROP POLICY IF EXISTS accounts_payable_delete_admin ON public.accounts_payable;

    CREATE POLICY accounts_payable_select_admin ON public.accounts_payable
      FOR SELECT TO authenticated
      USING (public.is_admin());

    CREATE POLICY accounts_payable_insert_admin ON public.accounts_payable
      FOR INSERT TO authenticated
      WITH CHECK (public.is_admin());

    CREATE POLICY accounts_payable_update_admin ON public.accounts_payable
      FOR UPDATE TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());

    CREATE POLICY accounts_payable_delete_admin ON public.accounts_payable
      FOR DELETE TO authenticated
      USING (public.is_admin());

    -- Auto-set paid_at
    CREATE OR REPLACE FUNCTION public.set_paid_at_accounts_payable()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    BEGIN
      IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
        NEW.paid_at := coalesce(NEW.paid_at, now());
      END IF;

      IF NEW.status <> 'paid' THEN
        NEW.paid_at := NULL;
      END IF;

      RETURN NEW;
    END;
    $fn$;

    DROP TRIGGER IF EXISTS trg_set_paid_at_accounts_payable ON public.accounts_payable;
    CREATE TRIGGER trg_set_paid_at_accounts_payable
      BEFORE UPDATE ON public.accounts_payable
      FOR EACH ROW
      EXECUTE FUNCTION public.set_paid_at_accounts_payable();
  END IF;
END $do$;

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
