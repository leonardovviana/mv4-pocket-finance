import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export type ChatConversation = Tables<"chat_conversations">;
export type ChatParticipant = Tables<"chat_participants">;
export type ChatMessage = Tables<"chat_messages">;
export type ChatAttachment = Tables<"chat_message_attachments">;

export type ChatUserLookup = { id: string; full_name: string | null; avatar_url: string | null };

export type ChatMessageWithAttachments = ChatMessage & {
  attachments: ChatAttachment[];
  sender: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

export function usePublicConversationId(enabled = true) {
  return useQuery({
    queryKey: ["chat", "publicConversation"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_or_create_public_conversation");
      if (error) throw error;
      return data;
    },
  });
}

export function useFindUserByEmail() {
  return useMutation({
    mutationFn: async (email: string): Promise<ChatUserLookup | null> => {
      const { data, error } = await supabase.rpc("find_user_by_email", { p_email: email });
      if (error) throw error;
      const row = data?.[0];
      return row ? { id: row.id, full_name: row.full_name ?? null, avatar_url: row.avatar_url ?? null } : null;
    },
  });
}

export function useCreateDirectConversation() {
  return useMutation({
    mutationFn: async (otherUserId: string): Promise<string> => {
      const { data, error } = await supabase.rpc("create_direct_conversation", { p_other_user_id: otherUserId });
      if (error) throw error;
      return data;
    },
  });
}

export function useMyConversationIds(userId?: string) {
  return useQuery({
    queryKey: ["chat", "myConversations", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_participants")
        .select("conversation_id")
        .eq("user_id", userId as string);

      if (error) throw error;
      return (data ?? []).map((r) => r.conversation_id);
    },
  });
}

export function useConversationParticipants(conversationId?: string) {
  return useQuery({
    queryKey: ["chat", "participants", conversationId],
    enabled: Boolean(conversationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_participants")
        .select("user_id")
        .eq("conversation_id", conversationId as string);
      if (error) throw error;
      return (data ?? []).map((r) => r.user_id);
    },
  });
}

export function useMessages(conversationId?: string) {
  return useQuery({
    queryKey: ["chat", "messages", conversationId],
    enabled: Boolean(conversationId),
    queryFn: async () => {
      const { data: messages, error: msgErr } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId as string)
        .order("created_at", { ascending: true });
      if (msgErr) throw msgErr;

      const ids = (messages ?? []).map((m) => m.id);
      if (ids.length === 0) return [] as ChatMessageWithAttachments[];

      const senderIds = Array.from(new Set((messages ?? []).map((m) => m.sender_id)));
      const { data: senders, error: senderErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", senderIds);
      if (senderErr) throw senderErr;

      const senderById = new Map<string, ChatUserLookup>();
      for (const s of senders ?? []) {
        senderById.set(s.id, { id: s.id, full_name: s.full_name ?? null, avatar_url: s.avatar_url ?? null });
      }

      const { data: atts, error: attErr } = await supabase
        .from("chat_message_attachments")
        .select("*")
        .in("message_id", ids);
      if (attErr) throw attErr;

      const byMessageId = new Map<string, ChatAttachment[]>();
      for (const a of atts ?? []) {
        const list = byMessageId.get(a.message_id) ?? [];
        list.push(a);
        byMessageId.set(a.message_id, list);
      }

      return (messages ?? []).map((m) => ({
        ...m,
        attachments: byMessageId.get(m.id) ?? [],
        sender: senderById.get(m.sender_id) ?? null,
      }));
    },
  });
}

export function useChatRealtime(conversationId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["chat", "messages", conversationId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_message_attachments" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["chat", "messages", conversationId] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);
}

export function useChatRealtimeFast(
  conversationId: string | undefined,
  onMessageInserted?: (msg: ChatMessage) => void
) {
  const queryClient = useQueryClient();
  const onInsertedRef = useRef(onMessageInserted);

  useEffect(() => {
    onInsertedRef.current = onMessageInserted;
  }, [onMessageInserted]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-fast:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = (payload as any)?.new as ChatMessage | undefined;
          if (msg) {
            try {
              onInsertedRef.current?.(msg);
            } catch {
              // ignore
            }
          }

          // Mantém UI consistente (sender/attachments são resolvidos pelo query)
          void queryClient.invalidateQueries({ queryKey: ["chat", "messages", conversationId] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      conversation_id: string;
      sender_id: string;
      kind: "text" | "payment_request" | "payment_receipt";
      body: string | null;
      metadata: Json;
    }) => {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: payload.conversation_id,
          sender_id: payload.sender_id,
          kind: payload.kind,
          body: payload.body,
          metadata: payload.metadata,
        });
      if (error) throw error;
      return;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["chat", "messages", variables.conversation_id] });
    },
  });
}

export function useAttachToMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      message_id: string;
      bucket_id: "chat_attachments";
      object_path: string;
      mime_type: string | null;
      size_bytes: number | null;
    }) => {
      const { error } = await supabase.from("chat_message_attachments").insert(payload);
      if (error) throw error;
      return;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chat", "messages"] });
    },
  });
}

export async function createSignedChatAttachmentUrl(path: string) {
  const { data, error } = await supabase.storage.from("chat_attachments").createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}
