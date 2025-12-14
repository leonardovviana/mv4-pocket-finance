-- Chat entre usuários + solicitações de pagamento + anexos (comprovantes)

-- Tabelas
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'text',
  body TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL,
  object_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS chat_participants_user_idx ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_conversation_created_idx ON public.chat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS chat_message_attachments_message_idx ON public.chat_message_attachments(message_id);

-- RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_attachments ENABLE ROW LEVEL SECURITY;

-- Policies: conversas
CREATE POLICY "Chat: select own conversations"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.conversation_id = id
      AND cp.user_id = auth.uid()
  )
);

-- Policies: participantes
CREATE POLICY "Chat: select participants for own conversations"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.conversation_id = conversation_id
      AND cp.user_id = auth.uid()
  )
);

-- Policies: mensagens
CREATE POLICY "Chat: select messages in own conversations"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.conversation_id = conversation_id
      AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Chat: insert messages in own conversations"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.conversation_id = conversation_id
      AND cp.user_id = auth.uid()
  )
);

-- Policies: anexos (linha de metadados do anexo)
CREATE POLICY "Chat: select attachments in own conversations"
ON public.chat_message_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_messages m
    JOIN public.chat_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_id
      AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Chat: insert attachments in own conversations"
ON public.chat_message_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.chat_messages m
    JOIN public.chat_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_id
      AND cp.user_id = auth.uid()
  )
);

-- RPC: buscar usuário por email (sem expor diretório completo)
CREATE OR REPLACE FUNCTION public.find_user_by_email(p_email TEXT)
RETURNS TABLE (id UUID, full_name TEXT, avatar_url TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id,
         p.full_name,
         p.avatar_url
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = lower(p_email)
  LIMIT 1;
$$;

-- RPC: criar/reutilizar conversa direta com outro usuário
CREATE OR REPLACE FUNCTION public.create_direct_conversation(p_other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me UUID := auth.uid();
  v_existing UUID;
  v_new UUID;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_other_user_id IS NULL OR p_other_user_id = v_me THEN
    RAISE EXCEPTION 'invalid other user';
  END IF;

  -- Reutiliza conversa 1:1 existente
  SELECT cp1.conversation_id
    INTO v_existing
  FROM public.chat_participants cp1
  JOIN public.chat_participants cp2
    ON cp2.conversation_id = cp1.conversation_id
  WHERE cp1.user_id = v_me
    AND cp2.user_id = p_other_user_id
    AND (SELECT count(*) FROM public.chat_participants cpx WHERE cpx.conversation_id = cp1.conversation_id) = 2
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.chat_conversations (created_by)
  VALUES (v_me)
  RETURNING id INTO v_new;

  INSERT INTO public.chat_participants (conversation_id, user_id)
  VALUES (v_new, v_me), (v_new, p_other_user_id);

  RETURN v_new;
END;
$$;

-- Bucket privado para anexos do chat
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'chat_attachments') THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'public'
    ) THEN
      EXECUTE 'INSERT INTO storage.buckets (id, name, public) VALUES (''chat_attachments'', ''chat_attachments'', false)';
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'is_public'
    ) THEN
      EXECUTE 'INSERT INTO storage.buckets (id, name, is_public) VALUES (''chat_attachments'', ''chat_attachments'', false)';
    ELSE
      EXECUTE 'INSERT INTO storage.buckets (id, name) VALUES (''chat_attachments'', ''chat_attachments'')';
    END IF;
  END IF;
END $$;

-- Policies em storage.objects para anexos do chat
-- Estrutura do path: <conversation_id>/<message_id>/<filename>
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Chat attachments: select by participant'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Chat attachments: select by participant"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'chat_attachments'
        AND EXISTS (
          SELECT 1
          FROM public.chat_participants cp
          WHERE cp.conversation_id = (storage.foldername(name))[1]::uuid
            AND cp.user_id = auth.uid()
        )
      );
    $sql$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Chat attachments: insert by participant'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Chat attachments: insert by participant"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'chat_attachments'
        AND EXISTS (
          SELECT 1
          FROM public.chat_participants cp
          WHERE cp.conversation_id = (storage.foldername(name))[1]::uuid
            AND cp.user_id = auth.uid()
        )
      );
    $sql$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Chat attachments: update by participant'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Chat attachments: update by participant"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'chat_attachments'
        AND EXISTS (
          SELECT 1
          FROM public.chat_participants cp
          WHERE cp.conversation_id = (storage.foldername(name))[1]::uuid
            AND cp.user_id = auth.uid()
        )
      )
      WITH CHECK (
        bucket_id = 'chat_attachments'
        AND EXISTS (
          SELECT 1
          FROM public.chat_participants cp
          WHERE cp.conversation_id = (storage.foldername(name))[1]::uuid
            AND cp.user_id = auth.uid()
        )
      );
    $sql$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Chat attachments: delete by participant'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Chat attachments: delete by participant"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'chat_attachments'
        AND EXISTS (
          SELECT 1
          FROM public.chat_participants cp
          WHERE cp.conversation_id = (storage.foldername(name))[1]::uuid
            AND cp.user_id = auth.uid()
        )
      );
    $sql$;
  END IF;
END $do$;
