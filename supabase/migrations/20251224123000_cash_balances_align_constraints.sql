-- Align cash_balances constraints with app keys (fixes 400 on insert/upsert when remote table was created earlier)

-- Ensure allowed account keys match frontend CASH_ACCOUNTS
ALTER TABLE public.cash_balances
  DROP CONSTRAINT IF EXISTS cash_balances_account_allowed;

ALTER TABLE public.cash_balances
  ADD CONSTRAINT cash_balances_account_allowed CHECK (account IN (
    'conta_ton',
    'conta_stone',
    'conta_cora',
    'conta_pagbank',
    'cheque',
    'dinheiro'
  ));

-- Ensure unique constraint exists (used by upsert on_conflict)
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cash_balances_user_account_unique'
      AND conrelid = 'public.cash_balances'::regclass
  ) THEN
    ALTER TABLE public.cash_balances
      ADD CONSTRAINT cash_balances_user_account_unique UNIQUE (user_id, account);
  END IF;
END $do$;

-- Ask PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
