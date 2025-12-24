-- cash_balances stays admin-only: employees must NOT see it

DROP POLICY IF EXISTS "Users can view own cash balances" ON public.cash_balances;
DROP POLICY IF EXISTS "Users can insert own cash balances" ON public.cash_balances;
DROP POLICY IF EXISTS "Users can update own cash balances" ON public.cash_balances;
DROP POLICY IF EXISTS "Users can delete own cash balances" ON public.cash_balances;

DROP POLICY IF EXISTS "Admins can manage cash_balances" ON public.cash_balances;

CREATE POLICY "Admins can manage cash_balances"
  ON public.cash_balances
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
