-- Chat público (para todos usuários autenticados)

-- 1) Flag de conversa pública
ALTER TABLE IF EXISTS public.chat_conversations
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Garante que exista no máximo 1 conversa pública
CREATE UNIQUE INDEX IF NOT EXISTS chat_conversations_public_singleton
ON public.chat_conversations (is_public)
WHERE is_public;

-- 2) RPC para obter/criar conversa pública (evita corrida no client)
CREATE OR REPLACE FUNCTION public.get_or_create_public_conversation()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_existing uuid;
  v_new uuid;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT id INTO v_existing
  FROM public.chat_conversations
  WHERE is_public = true
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  BEGIN
    INSERT INTO public.chat_conversations (created_by, is_public)
    VALUES (v_me, true)
    RETURNING id INTO v_new;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_new
    FROM public.chat_conversations
    WHERE is_public = true
    LIMIT 1;
  END;

  RETURN v_new;
END;
$$;

-- 3) Atualiza policies para permitir chat público
-- Conversas
DROP POLICY IF EXISTS "Chat: select own conversations" ON public.chat_conversations;

CREATE POLICY "Chat: select conversations (public or participant)"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (
  is_public = true
  OR EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.conversation_id = id
      AND cp.user_id = auth.uid()
  )
);

-- Participantes (mantém restrito por privacidade)
-- (não criamos policy de leitura para público; não é necessário no chat público)

-- Mensagens
DROP POLICY IF EXISTS "Chat: select messages in own conversations" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat: insert messages in own conversations" ON public.chat_messages;

CREATE POLICY "Chat: select messages (public or participant)"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id = conversation_id
      AND (
        c.is_public = true
        OR EXISTS (
          SELECT 1
          FROM public.chat_participants cp
          WHERE cp.conversation_id = conversation_id
            AND cp.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Chat: insert messages (public or participant)"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id = conversation_id
      AND (
        c.is_public = true
        OR EXISTS (
          SELECT 1
          FROM public.chat_participants cp
          WHERE cp.conversation_id = conversation_id
            AND cp.user_id = auth.uid()
        )
      )
  )
);

-- Anexos (tabela de metadados)
DROP POLICY IF EXISTS "Chat: select attachments in own conversations" ON public.chat_message_attachments;
DROP POLICY IF EXISTS "Chat: insert attachments in own conversations" ON public.chat_message_attachments;

CREATE POLICY "Chat: select attachments (public or participant)"
ON public.chat_message_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chat_messages m
    JOIN public.chat_conversations c ON c.id = m.conversation_id
    WHERE m.id = message_id
      AND (
        c.is_public = true
        OR EXISTS (
          SELECT 1
          FROM public.chat_participants cp
          WHERE cp.conversation_id = m.conversation_id
            AND cp.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Chat: insert attachments (public or participant)"
ON public.chat_message_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.chat_messages m
    JOIN public.chat_conversations c ON c.id = m.conversation_id
    WHERE m.id = message_id
      AND (
        c.is_public = true
        OR EXISTS (
          SELECT 1
          FROM public.chat_participants cp
          WHERE cp.conversation_id = m.conversation_id
            AND cp.user_id = auth.uid()
        )
      )
  )
);

-- 4) Storage: anexos do chat
-- Estrutura do path: <conversation_id>/<message_id>/<filename>
DROP POLICY IF EXISTS "Chat attachments: select by participant" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments: insert by participant" ON storage.objects;

CREATE POLICY "Chat attachments: select (public or participant)"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat_attachments'
  AND (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations c
      WHERE c.id = (storage.foldername(name))[1]::uuid
        AND c.is_public = true
    )
    OR EXISTS (
      SELECT 1
      FROM public.chat_participants cp
      WHERE cp.conversation_id = (storage.foldername(name))[1]::uuid
        AND cp.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Chat attachments: insert (public or participant)"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat_attachments'
  AND (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations c
      WHERE c.id = (storage.foldername(name))[1]::uuid
        AND c.is_public = true
    )
    OR EXISTS (
      SELECT 1
      FROM public.chat_participants cp
      WHERE cp.conversation_id = (storage.foldername(name))[1]::uuid
        AND cp.user_id = auth.uid()
    )
  )
);
