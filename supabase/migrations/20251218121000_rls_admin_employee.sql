-- RLS: admins can manage everything; employees only manage their own service_entries

-- service_entries
DROP POLICY IF EXISTS "Workspace members can view service_entries" ON public.service_entries;
DROP POLICY IF EXISTS "Workspace members can insert service_entries" ON public.service_entries;
DROP POLICY IF EXISTS "Workspace members can update service_entries" ON public.service_entries;
DROP POLICY IF EXISTS "Workspace members can delete service_entries" ON public.service_entries;

DROP POLICY IF EXISTS "Users can view own service_entries" ON public.service_entries;
DROP POLICY IF EXISTS "Users can insert own service_entries" ON public.service_entries;
DROP POLICY IF EXISTS "Users can update own service_entries" ON public.service_entries;
DROP POLICY IF EXISTS "Users can delete own service_entries" ON public.service_entries;

-- Admin: all
CREATE POLICY "Admins can view service_entries"
  ON public.service_entries
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert service_entries"
  ON public.service_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update service_entries"
  ON public.service_entries
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete service_entries"
  ON public.service_entries
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Employee: only own
CREATE POLICY "Employees can view own service_entries"
  ON public.service_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Employees can insert own service_entries"
  ON public.service_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employees can update own service_entries"
  ON public.service_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employees can delete own service_entries"
  ON public.service_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- expenses (admin only)
DROP POLICY IF EXISTS "Workspace members can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Workspace members can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Workspace members can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Workspace members can delete expenses" ON public.expenses;

DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

CREATE POLICY "Admins can manage expenses"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- cash_balances (admin only)
DROP POLICY IF EXISTS "Workspace members can view cash balances" ON public.cash_balances;
DROP POLICY IF EXISTS "Workspace members can insert cash balances" ON public.cash_balances;
DROP POLICY IF EXISTS "Workspace members can update cash balances" ON public.cash_balances;
DROP POLICY IF EXISTS "Workspace members can delete cash balances" ON public.cash_balances;

DROP POLICY IF EXISTS "Users can view own cash balances" ON public.cash_balances;
DROP POLICY IF EXISTS "Users can insert own cash balances" ON public.cash_balances;
DROP POLICY IF EXISTS "Users can update own cash balances" ON public.cash_balances;
DROP POLICY IF EXISTS "Users can delete own cash balances" ON public.cash_balances;

CREATE POLICY "Admins can manage cash_balances"
  ON public.cash_balances
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- Storage: expense receipts - admin or owner can read; write stays owner-only
DROP POLICY IF EXISTS "Expense receipts: select (workspace)" ON storage.objects;
DROP POLICY IF EXISTS "Expense receipts: select own" ON storage.objects;
DROP POLICY IF EXISTS "Expense receipts: select admin or own" ON storage.objects;

CREATE POLICY "Expense receipts: select admin or own"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'expense_receipts'
    AND (
      public.is_admin()
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
