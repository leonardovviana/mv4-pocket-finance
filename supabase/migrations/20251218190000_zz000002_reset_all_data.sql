-- RESET TOTAL dos dados do app (mantém usuários/auth e profiles)
-- ATENÇÃO: irreversível. Este migration apaga registros de finanças, lançamentos e chat,
-- e remove objetos do Storage (chat_attachments, expense_receipts, service_entry_receipts).

BEGIN;

-- Apagar arquivos (Storage)
DELETE FROM storage.objects
WHERE bucket_id IN (
  'chat_attachments',
  'expense_receipts',
  'service_entry_receipts'
);

-- Apagar dados de chat
TRUNCATE TABLE
  public.chat_message_attachments,
  public.chat_messages,
  public.chat_participants,
  public.chat_conversations
RESTART IDENTITY
CASCADE;

-- Apagar dados principais
TRUNCATE TABLE
  public.expenses,
  public.service_entries,
  public.cash_balances
RESTART IDENTITY
CASCADE;

COMMIT;
