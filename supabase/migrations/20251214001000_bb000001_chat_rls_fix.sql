-- Fix: evita recursão/infinite recursion em RLS (erro 500 no PostgREST)
-- Estratégia: usar função SECURITY DEFINER para checar participação sem aplicar RLS

-- 1) Helper
CREATE OR REPLACE FUNCTION public.is_chat_participant(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = auth.uid()
  );
$$;

-- 2) Policies
-- chat_conversations
DROP POLICY IF EXISTS "Chat: select conversations (public or participant)" ON public.chat_conversations;
DROP POLICY IF EXISTS "Chat: select own conversations" ON public.chat_conversations;

CREATE POLICY "Chat: select conversations (public or participant)"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (is_public = true OR public.is_chat_participant(id));

-- chat_participants
DROP POLICY IF EXISTS "Chat: select participants for own conversations" ON public.chat_participants;

-- Regra: usuário pode ver apenas sua própria linha de participante.
-- (Para chat público, não precisamos expor lista de participantes.)
CREATE POLICY "Chat: select own participant row"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- chat_messages
DROP POLICY IF EXISTS "Chat: select messages (public or participant)" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat: insert messages (public or participant)" ON public.chat_messages;
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
      AND (c.is_public = true OR public.is_chat_participant(conversation_id))
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
      AND (c.is_public = true OR public.is_chat_participant(conversation_id))
  )
);

-- chat_message_attachments (metadados)
DROP POLICY IF EXISTS "Chat: select attachments (public or participant)" ON public.chat_message_attachments;
DROP POLICY IF EXISTS "Chat: insert attachments (public or participant)" ON public.chat_message_attachments;
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
      AND (c.is_public = true OR public.is_chat_participant(m.conversation_id))
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
      AND (c.is_public = true OR public.is_chat_participant(m.conversation_id))
  )
);

-- 3) Storage policies (chat_attachments)
DROP POLICY IF EXISTS "Chat attachments: select (public or participant)" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments: insert (public or participant)" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments: select by participant" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments: insert by participant" ON storage.objects;

CREATE POLICY "Chat attachments: select (public or participant)"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat_attachments'
  AND EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id = (storage.foldername(name))[1]::uuid
      AND (c.is_public = true OR public.is_chat_participant(c.id))
  )
);

CREATE POLICY "Chat attachments: insert (public or participant)"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat_attachments'
  AND EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id = (storage.foldername(name))[1]::uuid
      AND (c.is_public = true OR public.is_chat_participant(c.id))
  )
);
