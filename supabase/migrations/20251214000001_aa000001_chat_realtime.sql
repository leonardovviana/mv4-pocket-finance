-- Habilita Realtime (postgres_changes) para o chat público
-- Obs: Supabase Realtime usa a publication supabase_realtime

DO $$
BEGIN
  -- chat_messages
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages';
  END IF;

  -- chat_message_attachments
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_message_attachments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_attachments';
  END IF;
END;
$$;

-- Para updates/deletes (se vierem a existir), garante payload completo.
ALTER TABLE IF EXISTS public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.chat_message_attachments REPLICA IDENTITY FULL;
