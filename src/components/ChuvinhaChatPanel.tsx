import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ChatTurn = { role: "user" | "assistant"; content: string };

function isLikelyDataQuestion(text: string) {
  return /\b(\d{1,2}\/\d{1,2})(?:\/\d{2,4})?\b/.test(text) && /\b(recebimento|recebimentos|despesa|despesas|receita|receitas)\b/i.test(text);
}

export function ChuvinhaChatPanel(props: {
  storageKey: string;
  context?: unknown;
  placeholder?: string;
  heightClassName?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [history]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(props.storageKey);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(props.storageKey, JSON.stringify(history.slice(-50)));
    } catch {
      // ignore
    }
  }, [history, props.storageKey]);

  const lastAssistant = useMemo(() => {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      if (history[i].role === "assistant") return history[i].content;
    }
    return null;
  }, [history]);

  const send = async () => {
    const text = message.trim();
    if (!text) return;

    setMessage("");
    setBusy(true);
    setHistory((prev) => [...prev, { role: "user", content: text }]);

    try {
      const { data, error } = await supabase.functions.invoke("chuvinha", {
        body: {
          mode: "chat",
          message: text,
          history: history.slice(-10).map((t) => ({ role: t.role, content: t.content })),
          context: props.context ?? null,
        },
      });

      if (error) throw error;

      const reply = typeof data?.reply === "string" ? data.reply : "Não entendi. Pode repetir?";
      setHistory((prev) => [...prev, { role: "assistant", content: reply }]);

      if (isLikelyDataQuestion(text) && /sem permissão/i.test(reply)) {
        toast({
          title: "Acesso restrito",
          description: "Você não tem permissão para ver esses dados.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Erro",
        description: e?.message ?? "Não foi possível falar com a Chuvinha",
        variant: "destructive",
      });
      setHistory((prev) => [...prev, { role: "assistant", content: "Tive um erro aqui. Tenta novamente." }]);
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="text-sm text-muted-foreground">
        Faça login para conversar com a Chuvinha.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={scrollRef} className={(props.heightClassName ?? "h-72") + " overflow-y-auto rounded-md border p-3 space-y-2"}>
        {history.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Pergunte algo para a Chuvinha. Ex: "Qual foi o total do mês?".
          </div>
        ) : (
          history.map((t, idx) => (
            <div
              key={idx}
              className={
                t.role === "user"
                  ? "ml-auto max-w-[85%] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm"
                  : "mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm"
              }
            >
              {t.content}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Textarea
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={props.placeholder ?? "Digite sua pergunta…"}
        />
        <Button type="button" onClick={send} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
        </Button>
      </div>

      {lastAssistant && /CHUVINHA_AI_API_KEY/i.test(lastAssistant) ? (
        <div className="text-xs text-muted-foreground">
          Admin: configure `CHUVINHA_AI_API_KEY` na Edge Function para liberar respostas gerais.
        </div>
      ) : null}
    </div>
  );
}
