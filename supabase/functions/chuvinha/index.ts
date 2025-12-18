/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

type RequestBody =
  | {
      mode: "chat";
      message: string;
      history?: ChatMessage[];
    }
  | {
      mode: "import_suggest";
      importKind: "despesas" | "receitas";
      rows: unknown[];
    };

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
    },
    ...init,
  });
}

function badRequest(message: string) {
  return json({ error: message }, { status: 400 });
}

function unauthorized() {
  return json({ error: "Não autorizado" }, { status: 401 });
}

function parsePtBrDateToIso(input: string): string | null {
  const m = input.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const yearRaw = m[3];
  const nowYear = new Date().getFullYear();
  const year = yearRaw ? (yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw)) : nowYear;
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function openAiChat(params: {
  messages: ChatMessage[];
}): Promise<string> {
  const apiKey = Deno.env.get("CHUVINHA_AI_API_KEY")?.trim();
  const baseUrl = (Deno.env.get("CHUVINHA_AI_BASE_URL")?.trim() || "https://api.groq.com/openai/v1").replace(/\/$/, "");
  const model = Deno.env.get("CHUVINHA_AI_MODEL")?.trim() || "llama-3.3-70b-versatile";

  if (!apiKey) {
    throw new Error("CHUVINHA_AI_API_KEY não configurada");
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: params.messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha ao chamar IA: ${res.status} ${text}`);
  }

  const data = (await res.json()) as any;
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("IA retornou resposta vazia");
  }
  return content;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 });

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return unauthorized();

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return badRequest("JSON inválido");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: "Supabase env não configurado na Function" }, { status: 500 });
  }

  // Importante: usa o JWT do usuário -> respeita RLS.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  if (body.mode === "chat") {
    const question = body.message?.trim();
    if (!question) return badRequest("Mensagem vazia");

    // 1) Respostas "com dados" sem IA (barato e confiável)
    const dateIso = parsePtBrDateToIso(question);
    const isRecebimentos = /\b(recebimento|recebimentos)\b/i.test(question);
    const isDespesas = /\b(despesa|despesas)\b/i.test(question);
    const isReceitas = /\b(receita|receitas)\b/i.test(question);

    if (dateIso && (isRecebimentos || isDespesas || isReceitas)) {
      if (isDespesas) {
        const { data, error } = await supabase
          .from("expenses")
          .select("id,name,amount,expense_date,paid")
          .eq("expense_date", dateIso)
          .order("created_at", { ascending: false });

        if (error) {
          return json({ reply: "Não consegui acessar despesas (sem permissão ou erro)." });
        }

        const total = (data ?? []).reduce((acc: number, e: any) => acc + Number(e.amount ?? 0), 0);
        const lines = (data ?? []).slice(0, 50).map((e: any) => `- ${e.name}: R$ ${Number(e.amount ?? 0).toFixed(2)}`);
        return json({
          reply:
            `Despesas em ${dateIso}: ${lines.length} registro(s).\nTotal: R$ ${total.toFixed(2)}\n` +
            (lines.length ? lines.join("\n") : "(Nenhuma)"),
        });
      }

      // receitas/recebimentos -> service_entries
      const paidOnly = isRecebimentos;
      let q = supabase
        .from("service_entries")
        .select("id,title,amount,entry_date,metadata")
        .eq("entry_date", dateIso)
        .order("created_at", { ascending: false });

      if (paidOnly) {
        q = q.contains("metadata", { paid: true } as any);
      } else if (isReceitas) {
        q = q.contains("metadata", { entry_type: "receita" } as any);
      }

      const { data, error } = await q;
      if (error) {
        return json({ reply: "Não consegui acessar esses lançamentos (sem permissão ou erro)." });
      }

      const total = (data ?? []).reduce((acc: number, e: any) => acc + Number(e.amount ?? 0), 0);
      const lines = (data ?? []).slice(0, 50).map((e: any) => `- ${e.title}: R$ ${Number(e.amount ?? 0).toFixed(2)}`);
      const label = paidOnly ? "Recebimentos" : isReceitas ? "Receitas" : "Lançamentos";
      return json({
        reply:
          `${label} em ${dateIso}: ${lines.length} registro(s).\nTotal: R$ ${total.toFixed(2)}\n` +
          (lines.length ? lines.join("\n") : "(Nenhum)"),
      });
    }

    // 2) Perguntas gerais: chama IA (sem acesso direto ao banco, exceto o que o usuário perguntou acima)
    const system: ChatMessage = {
      role: "system",
      content:
        "Você é a Chuvinha, uma gata rajada e agente financeira da MV4. Fale em pt-BR. Seja objetiva, educada e prática. Quando faltar informação, faça 1-2 perguntas curtas. Não invente números.\n\nLimitações: você só tem acesso aos dados quando o servidor retornar dados explícitos; caso contrário, peça a data/serviço/conta para eu consultar.",
    };

    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    try {
      const reply = await openAiChat({
        messages: [system, ...history, { role: "user", content: question }],
      });
      return json({ reply });
    } catch (e) {
      return json({
        reply:
          "Chuvinha ainda não está configurada com uma API de IA. Peça ao admin para configurar `CHUVINHA_AI_API_KEY` (e opcionalmente `CHUVINHA_AI_BASE_URL`/`CHUVINHA_AI_MODEL`).",
        detail: String(e),
      });
    }
  }

  if (body.mode === "import_suggest") {
    const rows = Array.isArray(body.rows) ? body.rows : null;
    if (!rows || rows.length === 0) return badRequest("Planilha vazia");

    const system: ChatMessage = {
      role: "system",
      content:
        "Você é a Chuvinha (agente financeira). Sua tarefa é transformar uma amostra de linhas de planilha em um JSON válido para importação. Responda SOMENTE com JSON.\n\nPara despesas, cada item deve ter: { kind: 'fixed'|'variable'|'provision', name: string, amount: number, expense_date: 'YYYY-MM-DD', paid?: boolean, payment_method?: string, notes?: string }.\nPara receitas, cada item deve ter: { service: 'servicos_variados', title: string, amount: number, entry_date: 'YYYY-MM-DD', paid?: boolean, payment_method?: string, notes?: string }.\n\nRegras: valores em BRL podem vir com vírgula; datas podem vir dd/mm/aaaa. Se não existir campo, infira pelo nome da coluna. Não invente dados ausentes: se não achar data, use hoje. Limite a 50 itens.",
    };

    const user: ChatMessage = {
      role: "user",
      content: JSON.stringify({ importKind: body.importKind, rows: rows.slice(0, 50) }),
    };

    try {
      const content = await openAiChat({ messages: [system, user] });
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        return json({ error: "IA retornou JSON inválido", raw: content }, { status: 502 });
      }
      return json({ suggestion: parsed });
    } catch (e) {
      return json({ error: "IA não configurada", detail: String(e) }, { status: 500 });
    }
  }

  return badRequest("Modo inválido");
});
