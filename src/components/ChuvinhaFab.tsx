import Papa from "papaparse";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfileRole } from "@/hooks/useProfileRole";
import { supabase } from "@/integrations/supabase/client";

import { Cat, Loader2, Upload } from "lucide-react";

type ChatTurn = { role: "user" | "assistant"; content: string };

type ImportKind = "despesas" | "receitas";

type ImportSuggestion = {
  items?: unknown[];
  warnings?: string[];
};

async function parseSpreadsheet(file: File): Promise<unknown[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    return Array.isArray(rows) ? rows : [];
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  return Array.isArray(parsed.data) ? parsed.data : [];
}

function isLikelyDataQuestion(text: string) {
  return /\b(\d{1,2}\/\d{1,2})(?:\/\d{2,4})?\b/.test(text) && /\b(recebimento|recebimentos|despesa|despesas|receita|receitas)\b/i.test(text);
}

export function ChuvinhaFab() {
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const roleQuery = useProfileRole();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "import">("chat");

  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [importKind, setImportKind] = useState<ImportKind>("receitas");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<unknown[] | null>(null);
  const [suggestion, setSuggestion] = useState<ImportSuggestion | null>(null);
  const [importing, setImporting] = useState(false);

  const bottomOffsetClass = "bottom-[calc(72px+env(safe-area-inset-bottom))]";

  const canShow = Boolean(user) && location.pathname !== "/auth";

  const isAdmin = (roleQuery.data ?? "employee") === "admin";

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, history]);

  useEffect(() => {
    if (!canShow) {
      setOpen(false);
      return;
    }
  }, [canShow]);

  useEffect(() => {
    // Persistência simples do chat
    const key = user ? `chuvinha_history_${user.id}` : null;
    if (!key) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [user?.id]);

  useEffect(() => {
    const key = user ? `chuvinha_history_${user.id}` : null;
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(history.slice(-50)));
    } catch {
      // ignore
    }
  }, [history, user?.id]);

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

  const analyzeImport = async () => {
    if (!importFile) return;

    setSuggestion(null);
    setImportRows(null);
    setBusy(true);

    try {
      const rows = await parseSpreadsheet(importFile);
      if (!rows.length) {
        toast({ title: "Planilha vazia", description: "Não encontrei linhas para importar.", variant: "destructive" });
        return;
      }
      setImportRows(rows);

      const { data, error } = await supabase.functions.invoke("chuvinha", {
        body: {
          mode: "import_suggest",
          importKind,
          rows: rows.slice(0, 50),
        },
      });
      if (error) throw error;

      const suggestion = (data?.suggestion ?? null) as ImportSuggestion | null;
      if (!suggestion) {
        toast({ title: "Erro", description: "A IA não retornou sugestão.", variant: "destructive" });
        return;
      }
      setSuggestion(suggestion);
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao analisar planilha", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const applyImport = async () => {
    if (!user) return;
    const items = Array.isArray(suggestion?.items) ? suggestion?.items : null;
    if (!items || items.length === 0) {
      toast({ title: "Nada para importar", description: "A sugestão veio vazia.", variant: "destructive" });
      return;
    }

    setImporting(true);
    try {
      if (importKind === "despesas") {
        const payload = items as Array<any>;
        const { error } = await supabase.from("expenses").insert(
          payload.map((i) => ({
            user_id: user.id,
            kind: i.kind,
            name: i.name,
            amount: Number(i.amount).toFixed(2),
            expense_date: i.expense_date,
            paid: Boolean(i.paid ?? false),
            payment_method: i.payment_method ?? null,
            notes: i.notes ?? null,
            metadata: {},
          }))
        );
        if (error) throw error;
      } else {
        const payload = items as Array<any>;
        const { error } = await supabase.from("service_entries").insert(
          payload.map((i) => {
            const paid = Boolean(i.paid ?? false);
            const amount = Math.abs(Number(i.amount ?? 0));
            return {
              user_id: user.id,
              service: i.service ?? "servicos_variados",
              title: i.title,
              amount: Number.isFinite(amount) ? amount.toFixed(2) : null,
              entry_date: i.entry_date,
              status: paid ? "pago" : null,
              notes: i.notes ?? null,
              metadata: {
                entry_type: "receita",
                paid,
                payment_method: i.payment_method ?? undefined,
                paid_amount: paid && Number.isFinite(amount) && amount > 0 ? amount : undefined,
              },
            };
          })
        );
        if (error) throw error;
      }

      toast({ title: "Importado", description: `Importação concluída (${items.length} itens).` });
      setImportFile(null);
      setImportRows(null);
      setSuggestion(null);
    } catch (e: any) {
      toast({
        title: "Erro ao importar",
        description: e?.message ?? "Falha ao inserir no banco",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  if (!canShow) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Abrir Chuvinha"
        onClick={() => setOpen(true)}
        className={`fixed right-4 ${bottomOffsetClass} z-[60] h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg ios-tap flex items-center justify-center`}
      >
        <Cat className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chuvinha</DialogTitle>
            <DialogDescription className="sr-only">
              Assistente financeira da MV4 para conversar e importar planilhas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={tab === "chat" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("chat")}
            >
              Conversar
            </Button>
            <Button
              type="button"
              variant={tab === "import" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("import")}
            >
              Importar planilha
            </Button>
          </div>

          {tab === "chat" ? (
            <div className="space-y-3">
              <div ref={scrollRef} className="h-72 overflow-y-auto rounded-md border p-3 space-y-2">
                {history.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Pergunte algo para a Chuvinha. Ex: "Quais foram os recebimentos do dia 23/12?"
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
                  placeholder="Digite sua pergunta…"
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
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={importKind === "receitas" ? "default" : "outline"}
                  onClick={() => setImportKind("receitas")}
                >
                  Receitas
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={importKind === "despesas" ? "default" : "outline"}
                  onClick={() => setImportKind("despesas")}
                  disabled={!isAdmin}
                >
                  Despesas
                </Button>
              </div>

              {!isAdmin && importKind === "despesas" ? (
                <div className="text-sm text-muted-foreground">Somente admin pode importar despesas.</div>
              ) : null}

              <div className="space-y-2">
                <Input
                  type="file"
                  accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setImportFile(f);
                    setImportRows(null);
                    setSuggestion(null);
                  }}
                />
                <Button type="button" variant="outline" onClick={analyzeImport} disabled={!importFile || busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Analisar
                </Button>
              </div>

              {suggestion?.warnings?.length ? (
                <div className="rounded-md border p-3 text-sm">
                  <div className="font-medium">Avisos</div>
                  <ul className="mt-1 list-disc pl-5">
                    {suggestion.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(suggestion?.items) ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Prévia: {suggestion.items.length} item(s)
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-md border p-2 text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(suggestion.items.slice(0, 5), null, 2)}
                    {suggestion.items.length > 5 ? "\n…" : ""}
                  </div>
                  <Button type="button" onClick={applyImport} disabled={importing}>
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Importar"}
                  </Button>
                </div>
              ) : null}

              {importRows && !suggestion ? (
                <div className="text-sm text-muted-foreground">Aguardando sugestão da IA…</div>
              ) : null}

              <div className="text-xs text-muted-foreground">
                Dica: para perguntas com dados (ex: recebimentos por data), a Chuvinha consulta o Supabase respeitando suas permissões.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
