import { IOSCardGroup, IOSListItem } from "@/components/IOSCard";
import { IOSPage } from "@/components/IOSPage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
    createSignedChatAttachmentUrl,
    useAttachToMessage,
    useChatRealtime,
    useChatRealtimeFast,
    useMessages,
    usePublicConversationId,
    useSendMessage,
    type ChatMessageWithAttachments,
} from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/domain";
import { requestNotificationPermissionOnce, showNotificationSafely } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { Loader2, MessageCircle, Paperclip, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseAmountBR(values: string) {
  const normalized = values.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getSenderName(msg: ChatMessageWithAttachments) {
  return msg.sender?.full_name?.trim() ? msg.sender.full_name.trim() : "Usuário";
}

function getNotificationText(msg: ChatMessageWithAttachments) {
  const sender = getSenderName(msg);
  const meta = (msg.metadata ?? {}) as Record<string, unknown>;

  if (msg.kind === "payment_request") {
    const amount = typeof meta.amount === "number" ? meta.amount : null;
    const description = typeof meta.description === "string" ? meta.description : "";

    return {
      title: `${sender} enviou uma solicitação de pagamento`,
      body: [description?.trim() ? description.trim() : null, amount !== null ? formatBRL(amount) : null]
        .filter(Boolean)
        .join(" • "),
      requireInteraction: true,
    };
  }

  if (msg.kind === "text") {
    const body = msg.body?.trim() ?? "";
    return {
      title: sender,
      body: body ? `"${body}"` : "Nova mensagem",
      requireInteraction: false,
    };
  }

  if (msg.kind === "payment_receipt") {
    return {
      title: sender,
      body: "Enviou um comprovante",
      requireInteraction: false,
    };
  }

  return { title: sender, body: "Nova atividade", requireInteraction: false };
}

function MessageBubble(props: {
  meId: string;
  msg: ChatMessageWithAttachments;
  onOpenAttachment: (path: string) => Promise<void>;
  onSendReceiptForRequest: (requestMessageId: string) => void;
}) {
  const isMine = props.msg.sender_id === props.meId;
  const meta = (props.msg.metadata ?? {}) as Record<string, unknown>;

  const senderName = isMine ? "Você" : (props.msg.sender?.full_name ?? "Usuário");

  const paymentRequestAmount =
    props.msg.kind === "payment_request" ? (typeof meta.amount === "number" ? meta.amount : null) : null;
  const paymentRequestDescription =
    props.msg.kind === "payment_request" ? (typeof meta.description === "string" ? meta.description : "") : "";
  const paymentPixKey =
    props.msg.kind === "payment_request" ? (typeof meta.pix_key === "string" ? meta.pix_key : "") : "";

  const receiptFor =
    props.msg.kind === "payment_receipt" ? (typeof meta.request_message_id === "string" ? meta.request_message_id : "") : "";

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
          isMine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
        )}
      >
        <p className={cn("text-[11px] font-medium opacity-80", isMine ? "text-primary-foreground" : "text-muted-foreground")}>
          {senderName}
        </p>

        {props.msg.kind === "payment_request" ? (
          <div className="space-y-1">
            <p className="font-medium">Solicitação de pagamento</p>
            {paymentRequestAmount !== null && <p className="text-base">{formatBRL(paymentRequestAmount)}</p>}
            {paymentRequestDescription ? <p className="opacity-90">{paymentRequestDescription}</p> : null}

            {paymentPixKey ? (
              <div className="mt-2 space-y-2">
                <p className={cn("text-xs", isMine ? "text-primary-foreground/80" : "text-muted-foreground")}>Chave Pix</p>
                <div className={cn(
                  "rounded-lg px-2 py-1 text-xs break-all",
                  isMine ? "bg-primary-foreground/15 text-primary-foreground" : "bg-background/60 text-foreground"
                )}>
                  {paymentPixKey}
                </div>
                {!isMine ? (
                  <Button
                    type="button"
                    variant={isMine ? "secondary" : "outline"}
                    size="sm"
                    className={cn(isMine ? "text-primary" : "", "w-full")}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(paymentPixKey);
                      } catch {
                        // fallback simples
                        window.prompt("Copie a chave Pix:", paymentPixKey);
                      }
                    }}
                  >
                    Copiar chave Pix
                  </Button>
                ) : null}
              </div>
            ) : null}

            {!isMine ? (
              <Button
                type="button"
                variant={isMine ? "secondary" : "outline"}
                size="sm"
                className={cn(isMine ? "text-primary" : "", "mt-2")}
                onClick={() => props.onSendReceiptForRequest(props.msg.id)}
              >
                Enviar comprovante
              </Button>
            ) : null}
          </div>
        ) : props.msg.kind === "payment_receipt" ? (
          <div className="space-y-1">
            <p className="font-medium">Comprovante enviado</p>
            {receiptFor ? <p className="opacity-90">Ref: {receiptFor.slice(0, 8)}…</p> : null}
          </div>
        ) : null}

        {props.msg.body ? <p className={cn(props.msg.kind !== "text" ? "mt-2" : "")}>{props.msg.body}</p> : null}

        {props.msg.attachments.length > 0 ? (
          <div className="mt-2 space-y-2">
            {props.msg.attachments.map((a) => (
              <Button
                key={a.id}
                type="button"
                variant={isMine ? "secondary" : "outline"}
                size="sm"
                className={cn(isMine ? "text-primary" : "", "w-full justify-start")}
                onClick={() => props.onOpenAttachment(a.object_path)}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Abrir anexo
              </Button>
            ))}
          </div>
        ) : null}

        <p className={cn("mt-2 text-[11px] opacity-70", isMine ? "text-primary-foreground" : "text-muted-foreground")}
        >
          {new Date(props.msg.created_at).toLocaleString("pt-BR")}
        </p>
      </div>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const { toast } = useToast();

  const publicConvQuery = usePublicConversationId(Boolean(userId));
  const activeConversationId = publicConvQuery.data ?? null;

  const [composeText, setComposeText] = useState("");
  const [attachFile, setAttachFile] = useState<File | null>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDesc, setPaymentDesc] = useState("");
  const [paymentPixKey, setPaymentPixKey] = useState("");

  const [receiptRequestId, setReceiptRequestId] = useState<string | null>(null);

  const messagesQuery = useMessages(activeConversationId ?? undefined);
  useChatRealtime(activeConversationId ?? undefined);
  const sendMessage = useSendMessage();
  const attachToMessage = useAttachToMessage();

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesQuery.data && messagesQuery.data.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messagesQuery.data?.length]);

  // Pede permissão de notificações (uma vez por dispositivo)
  useEffect(() => {
    if (!userId) return;
    requestNotificationPermissionOnce("mv4:pwa:chat-notifications-asked");
  }, [userId]);

  // Notifica via realtime (mais rápido que esperar refetch)
  const initializedFastRef = useRef(false);
  useEffect(() => {
    if (!activeConversationId) return;
    if (!userId) return;
    // depois que a lista inicial carregou, pode notificar novos INSERTs
    if ((messagesQuery.data ?? []).length > 0) {
      initializedFastRef.current = true;
    }
  }, [activeConversationId, userId, messagesQuery.data?.length]);

  useChatRealtimeFast(activeConversationId ?? undefined, (msg) => {
      if (!userId) return;
      if (!activeConversationId) return;
      if (msg.sender_id === userId) return;

      // primeira carga: não notifica
      if (!initializedFastRef.current) {
        initializedFastRef.current = true;
        return;
      }

      // se estiver ativo/aberto, não notifica
      if (typeof document !== "undefined") {
        const active =
          document.visibilityState === "visible" &&
          (typeof document.hasFocus === "function" ? document.hasFocus() : true);
        if (active) return;
      }

      const meta = (msg.metadata ?? {}) as Record<string, unknown>;
      const bodyText = typeof msg.body === "string" ? msg.body.trim() : "";

      const requireInteraction = msg.kind === "payment_request";
      const title = requireInteraction ? "Solicitação de pagamento" : "Nova mensagem";
      const body =
        msg.kind === "payment_request"
          ? [
              typeof meta.description === "string" ? meta.description : null,
              typeof meta.amount === "number" ? formatBRL(meta.amount) : null,
            ]
              .filter(Boolean)
              .join(" • ") || "Nova solicitação"
          : bodyText || "Nova atividade";

      void showNotificationSafely({
        title,
        body,
        url: "/chat",
        tag: `chat:${activeConversationId}`,
        requireInteraction,
      });
  });

  const canSend = Boolean(activeConversationId) && (composeText.trim() || attachFile);

  const handleOpenAttachment = async (path: string) => {
    const url = await createSignedChatAttachmentUrl(path);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSendTextOrAttachment = async () => {
    if (!activeConversationId || !userId) return;

    try {
      const created = await sendMessage.mutateAsync({
        conversation_id: activeConversationId,
        sender_id: userId,
        kind: "text",
        body: composeText.trim() ? composeText.trim() : null,
        metadata: {},
      });

      if (attachFile) {
        const safeName = safeFilename(attachFile.name);
        const objectPath = `${activeConversationId}/${created.id}/${Date.now()}_${safeName}`;

        const { error } = await supabase.storage
          .from("chat_attachments")
          .upload(objectPath, attachFile, { upsert: true, contentType: attachFile.type });
        if (error) throw error;

        await attachToMessage.mutateAsync({
          message_id: created.id,
          bucket_id: "chat_attachments",
          object_path: objectPath,
          mime_type: attachFile.type || null,
          size_bytes: attachFile.size ?? null,
        });
      }

      setComposeText("");
      setAttachFile(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro ao enviar mensagem";
      toast({
        title: "Não foi possível enviar",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleSendPaymentRequest = async () => {
    if (!activeConversationId || !userId) return;
    const amount = parseAmountBR(paymentAmount);
    if (amount === null) return;

    try {
      await sendMessage.mutateAsync({
        conversation_id: activeConversationId,
        sender_id: userId,
        kind: "payment_request",
        body: null,
        metadata: {
          amount,
          description: paymentDesc.trim() ? paymentDesc.trim() : null,
          pix_key: paymentPixKey.trim() ? paymentPixKey.trim() : null,
        },
      });

      setPaymentOpen(false);
      setPaymentAmount("");
      setPaymentDesc("");
      setPaymentPixKey("");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro ao enviar solicitação";
      toast({
        title: "Não foi possível solicitar",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleSendReceipt = async () => {
    if (!activeConversationId || !userId || !receiptRequestId) return;
    if (!attachFile) return;

    try {
      const created = await sendMessage.mutateAsync({
        conversation_id: activeConversationId,
        sender_id: userId,
        kind: "payment_receipt",
        body: composeText.trim() ? composeText.trim() : null,
        metadata: {
          request_message_id: receiptRequestId,
        },
      });

      const safeName = safeFilename(attachFile.name);
      const objectPath = `${activeConversationId}/${created.id}/${Date.now()}_${safeName}`;

      const { error } = await supabase.storage
        .from("chat_attachments")
        .upload(objectPath, attachFile, { upsert: true, contentType: attachFile.type });
      if (error) throw error;

      await attachToMessage.mutateAsync({
        message_id: created.id,
        bucket_id: "chat_attachments",
        object_path: objectPath,
        mime_type: attachFile.type || null,
        size_bytes: attachFile.size ?? null,
      });

      setComposeText("");
      setAttachFile(null);
      setReceiptRequestId(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro ao enviar comprovante";
      toast({
        title: "Não foi possível enviar comprovante",
        description: message,
        variant: "destructive",
      });
    }
  };

  const sendAction = receiptRequestId ? handleSendReceipt : handleSendTextOrAttachment;

  const title = "Chat Público";

  const activeMessages = messagesQuery.data ?? [];
  const messagesError = messagesQuery.error instanceof Error ? messagesQuery.error.message : null;

  return (
    <IOSPage title={title} showLargeTitle={false}>
      <div className="-mx-4">
        <div className="px-4">
          {!activeConversationId && !publicConvQuery.isLoading ? (
            <IOSCardGroup>
              <IOSListItem
                icon={<MessageCircle className="w-4 h-4" />}
                iconBgColor="bg-secondary"
                title="Não foi possível abrir o chat"
                subtitle="A RPC get_or_create_public_conversation não está disponível"
              />
            </IOSCardGroup>
          ) : null}
        </div>

        <div className="px-4 pb-[calc(11rem+env(safe-area-inset-bottom,20px))] space-y-3">
          {publicConvQuery.isLoading || messagesQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : messagesQuery.isError ? (
            <IOSCardGroup>
              <IOSListItem
                icon={<MessageCircle className="w-4 h-4" />}
                iconBgColor="bg-secondary"
                title="Erro ao carregar mensagens"
                subtitle={messagesError ?? "Erro interno"}
              />
            </IOSCardGroup>
          ) : activeConversationId && activeMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem mensagens ainda.</p>
          ) : (
            activeMessages.map((m) => (
              <MessageBubble
                key={m.id}
                meId={userId}
                msg={m}
                onOpenAttachment={handleOpenAttachment}
                onSendReceiptForRequest={(reqId) => {
                  setReceiptRequestId(reqId);
                }}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {activeConversationId ? (
          <div className="fixed left-0 right-0 bottom-[calc(60px+env(safe-area-inset-bottom,20px))] z-40 ios-blur bg-background/80 border-t border-border">
            <div className="max-w-lg mx-auto px-4 py-2 space-y-2">
              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" size="sm" onClick={() => setPaymentOpen(true)}>
                  Solicitar pagamento
                </Button>
                <div className="flex items-center gap-2">
                  <Label htmlFor="chat_attach" className="sr-only">
                    Anexo
                  </Label>
                  <Input
                    id="chat_attach"
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => setAttachFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("chat_attach")?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {receiptRequestId ? (
                <p className="text-xs text-muted-foreground">
                  Enviando comprovante para {receiptRequestId.slice(0, 8)}…
                </p>
              ) : null}

              {attachFile ? <p className="text-xs text-muted-foreground">Arquivo: {attachFile.name}</p> : null}

              <div className="flex items-end gap-2">
                <Textarea
                  rows={1}
                  placeholder={receiptRequestId ? "Mensagem (opcional)" : "Mensagem"}
                  value={composeText}
                  onChange={(e) => setComposeText(e.target.value)}
                  className="min-h-[40px] max-h-28"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    await sendAction();
                  }}
                  disabled={!canSend || sendMessage.isPending || attachToMessage.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Solicitação de pagamento */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar pagamento</DialogTitle>
            <DialogDescription>Envie uma solicitação de pagamento no chat público.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input id="amount" inputMode="decimal" placeholder="0,00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
              {paymentAmount && parseAmountBR(paymentAmount) === null ? (
                <p className="text-sm text-destructive">Valor inválido</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pix_key">Chave Pix</Label>
              <Input
                id="pix_key"
                placeholder="Ex: CPF, e-mail, celular ou chave aleatória"
                value={paymentPixKey}
                onChange={(e) => setPaymentPixKey(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Descrição (opcional)</Label>
              <Textarea id="desc" rows={3} value={paymentDesc} onChange={(e) => setPaymentDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              onClick={handleSendPaymentRequest}
              disabled={sendMessage.isPending || parseAmountBR(paymentAmount) === null}
            >
              Enviar solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </IOSPage>
  );
}
