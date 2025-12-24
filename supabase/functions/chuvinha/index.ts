/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

type RequestBody =
  | {
      mode: "chat";
      message: string;
      history?: ChatMessage[];
      context?: unknown;
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

function parseMonthKey(input: string): string | null {
  const t = input.trim();
  const m = t.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/);
  if (!m) return null;
  return `${m[1]}-${m[2]}`;
}

function monthRange(monthKey: string) {
  const startDate = `${monthKey}-01`;
  const start = new Date(`${startDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    return null;
  }
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  const endDate = end.toISOString().slice(0, 10);
  return {
    startDate,
    endDate,
    startTs: start.toISOString(),
    endTs: end.toISOString(),
  };
}

function normalizeText(input: string) {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function parseMoneyBRLFromText(input: string): number | null {
  const text = input.replace(/\s+/g, " ");
  const m = text.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?/i);
  if (!m) return null;
  const intPart = String(m[1]).replace(/\./g, "");
  const decPart = m[2] ? String(m[2]).padEnd(2, "0") : "00";
  const n = Number(`${intPart}.${decPart}`);
  return Number.isFinite(n) ? n : null;
}

function detectServiceKey(input: string):
  | "gestao_midias"
  | "melhores_do_ano"
  | "premio_excelencia"
  | "carro_de_som"
  | "revista_factus"
  | "revista_saude"
  | "servicos_variados" {
  const t = normalizeText(input);
  if (/(gestao|gestao de midias|midias|midia)/.test(t)) return "gestao_midias";
  if (/melhores? do ano/.test(t)) return "melhores_do_ano";
  if (/premio\s+excelencia/.test(t)) return "premio_excelencia";
  if (/carro\s+de\s+som/.test(t)) return "carro_de_som";
  if (/revista\s+factus/.test(t)) return "revista_factus";
  if (/revista\s+saude|factus\s+saude/.test(t)) return "revista_saude";
  return "servicos_variados";
}

function pickContextMonth(rawContext: any): string | null {
  const m = typeof rawContext?.month === "string" ? rawContext.month.trim() : "";
  return /^\d{4}-\d{2}$/.test(m) ? m : null;
}

function detectPaid(input: string): boolean {
  const t = normalizeText(input);
  if (/(nao\s+pag|ainda\s+nao\s+pag|em\s+aberto|pendente)/.test(t)) return false;
  if (/(ja\s+pag|pago|quitad)/.test(t)) return true;
  return false;
}

function detectRecurringRule(input: string): string | null {
  const t = normalizeText(input);
  if (/(mensal|mensais)/.test(t)) return "mensal";
  if (/(semanal|semanais)/.test(t)) return "semanal";
  if (/(anual|anuais)/.test(t)) return "anual";
  return null;
}

function extractTitleAfterVerb(input: string): string | null {
  // Ex: "cadastre duo medic valor R$1.500 mensal ..." -> "duo medic"
  const raw = input.trim();
  const lowered = normalizeText(raw);
  const idx = lowered.match(/^(cadastre|cadastrar)\b/);
  if (!idx) return null;

  let rest = raw.replace(/^(\s*)(cadastre|cadastrar)\b/i, "").trim();
  rest = rest.replace(/^[:\-]+\s*/, "").trim();

  const cutCandidates: number[] = [];

  const moneyLike = rest.search(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?/i);
  if (moneyLike >= 0) cutCandidates.push(moneyLike);

  const keywords = rest.search(
    /\b(valor|r\$|mensal|mensais|semanal|semanais|anual|anuais|em\s+|para\s+|no\s+|na\s+|ainda\s+|ja\s+|pago|pagou|nao\s+pagou|não\s+pagou)\b/i
  );
  if (keywords >= 0) cutCandidates.push(keywords);

  const cut = cutCandidates.length ? Math.min(...cutCandidates) : -1;
  const title = (cut >= 0 ? rest.slice(0, cut) : rest).trim();
  return title ? title : null;
}

function isServiceKey(v: unknown): v is
  | "gestao_midias"
  | "melhores_do_ano"
  | "premio_excelencia"
  | "carro_de_som"
  | "revista_factus"
  | "revista_saude"
  | "servicos_variados" {
  return (
    v === "gestao_midias" ||
    v === "melhores_do_ano" ||
    v === "premio_excelencia" ||
    v === "carro_de_som" ||
    v === "revista_factus" ||
    v === "revista_saude" ||
    v === "servicos_variados"
  );
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

  // Cliente do usuário (respeita RLS) — usado para autenticar e descobrir role.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const authedUser = userData?.user ?? null;
  if (userError || !authedUser) {
    return unauthorized();
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authedUser.id)
    .maybeSingle();
  const role = (profileData?.role === "admin" ? "admin" : "employee") as "admin" | "employee";

  // Modo admin: permissão total (bypass RLS) via Service Role Key.
  // Só ativa se quem chamou for admin.
  let supabaseAdmin: ReturnType<typeof createClient> | null = null;
  if (role === "admin") {
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() || Deno.env.get("SERVICE_ROLE_KEY")?.trim() || "";
    if (!serviceRoleKey) {
      return json({
        reply:
          "Miau… eu posso ter permissão total, mas falta configurar a `SUPABASE_SERVICE_ROLE_KEY` na Edge Function. Aí minhas garrinhas viram modo admin de verdade.",
      });
    }
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  const db = supabaseAdmin ?? supabase;

  if (body.mode === "chat") {
    const question = body.message?.trim();
    if (!question) return badRequest("Mensagem vazia");

    const rawContext = (body as any)?.context as any;
    const contextService = isServiceKey(rawContext?.service) ? (rawContext.service as any) : null;
    const contextMonth = pickContextMonth(rawContext);

    // 0) Comandos de cadastro
    if (/^(\s*)(cadastre|cadastrar)\b/i.test(question)) {
      const amount = parseMoneyBRLFromText(question);
      const title = extractTitleAfterVerb(question);
      const detectedService = detectServiceKey(question);
      const service = detectedService !== "servicos_variados" ? detectedService : (contextService ?? detectedService);
      const recurringRule = detectRecurringRule(question);
      const paid = detectPaid(question);
      const entryDate = new Date().toISOString().slice(0, 10);

      if (!title) {
        return json({ reply: "Miau! Qual é o nome/título desse cadastro? (ex: 'cadastre Duo Medic ...')" });
      }
      if (amount === null) {
        return json({ reply: "Miau! Qual é o valor? (ex: R$ 1.500,00)" });
      }

      const metadata: Record<string, unknown> = {
        entry_type: "receita",
        paid,
        payment_method: undefined,
      };

      if (recurringRule) {
        metadata.recurring = true;
        metadata.recurring_rule = recurringRule;
      }

      if (paid && amount > 0) {
        metadata.paid_amount = amount;
      }

      const { data: inserted, error: insertError } = await db
        .from("service_entries")
        .insert({
          user_id: authedUser.id,
          service,
          title,
          amount: amount.toFixed(2),
          entry_date: entryDate,
          status: paid ? "pago" : null,
          notes: null,
          metadata,
        })
        .select("id");

      if (insertError) {
        return json({
          reply:
            "Miau… tentei cadastrar, mas deu erro no banco: " + String(insertError.message ?? insertError),
        });
      }

      const paidLabel = paid ? "pago" : "em aberto";
      const recLabel = recurringRule ? ` (${recurringRule})` : "";
      const insertedId = Array.isArray(inserted) ? inserted?.[0]?.id : (inserted as any)?.id;
      return json({
        reply:
          `Miau! Cadastrei pra você: '${title}' em ${service}, R$ ${amount.toFixed(2)}${recLabel}, ${paidLabel}. (id: ${insertedId ?? "-"})`,
      });
    }

    // 1) Respostas "com dados" sem IA (barato e confiável)
    const dateIso = parsePtBrDateToIso(question);
    const isRecebimentos = /\b(recebimento|recebimentos)\b/i.test(question);
    const isDespesas = /\b(despesa|despesas)\b/i.test(question);
    const isReceitas = /\b(receita|receitas)\b/i.test(question);

    if (dateIso && (isRecebimentos || isDespesas || isReceitas)) {
      if (isDespesas) {
        if (role !== "admin") {
          return json({
            reply:
              "Miau! As despesas ficam guardadinhas só pro admin. Você está como funcionário — entra como admin e eu te conto tudinho.",
          });
        }

        const { data, error } = await db
          .from("expenses")
          .select("id,name,amount,expense_date,paid")
          .eq("expense_date", dateIso)
          .order("created_at", { ascending: false });

        if (error) {
          return json({
            reply:
              "Não consegui acessar despesas agora. Pode ser permissão/configuração. Se persistir, me mande o print desse erro: " +
              String(error.message ?? error),
          });
        }

        const total = (data ?? []).reduce((acc: number, e: any) => acc + Number(e.amount ?? 0), 0);
        const lines = (data ?? []).slice(0, 50).map((e: any) => `- ${e.name}: R$ ${Number(e.amount ?? 0).toFixed(2)}`);
        return json({
          reply:
            `Miau! Aqui vão as despesas em ${dateIso}: ${lines.length} registro(s).\nTotal: R$ ${total.toFixed(2)}\n` +
            (lines.length ? lines.join("\n") : "(Nenhuma)"),
        });
      }

      // receitas/recebimentos -> service_entries
      const paidOnly = isRecebimentos;
      let q = db
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
        return json({
          reply:
            "Não consegui acessar esses lançamentos agora. Pode ser permissão/configuração. Se persistir, me mande o print desse erro: " +
            String(error.message ?? error),
        });
      }

      const total = (data ?? []).reduce((acc: number, e: any) => acc + Number(e.amount ?? 0), 0);
      const lines = (data ?? []).slice(0, 50).map((e: any) => `- ${e.title}: R$ ${Number(e.amount ?? 0).toFixed(2)}`);
      const label = paidOnly ? "Recebimentos" : isReceitas ? "Receitas" : "Lançamentos";
      return json({
        reply:
          `Miau! ${label} em ${dateIso}: ${lines.length} registro(s).\nTotal: R$ ${total.toFixed(2)}\n` +
          (lines.length ? lines.join("\n") : "(Nenhum)"),
      });
    }

    // 1.1) Perguntas por mês (quando o app já envia o mês selecionado na aba)
    const monthKey = contextMonth ?? parseMonthKey(question);
    const asksOpen = /\b(falta\s+pagar|quem\s+falta\s+pagar|em\s+aberto|pendente|pendencias|pendências)\b/i.test(question);
    const asksMonthly =
      /\b(mes|mês|mensal|no\s+mes|no\s+mês|neste\s+mes|neste\s+mês|nesse\s+mes|nesse\s+mês)\b/i.test(question) ||
      Boolean(monthKey && (asksOpen || isDespesas || isReceitas || isRecebimentos));

    if (monthKey && asksMonthly && (asksOpen || isDespesas || isReceitas || isRecebimentos)) {
      const range = monthRange(monthKey);
      if (!range) {
        return json({ reply: "Miau… não entendi qual mês você quis dizer. Use formato YYYY-MM (ex: 2025-12)." });
      }

      const service = contextService ?? (detectServiceKey(question) as any);
      const scopedService = contextService ? contextService : service;

      // (A) service_entries: receitas/despesas e pendências de recebimento
      let se = db
        .from("service_entries")
        .select("id,title,amount,entry_date,created_at,service,metadata")
        .order("created_at", { ascending: false });

      if (scopedService && scopedService !== "servicos_variados") {
        se = se.eq("service", scopedService);
      }

      const { data: seData, error: seErr } = await se.or(
        `and(entry_date.gte.${range.startDate},entry_date.lt.${range.endDate}),and(entry_date.is.null,created_at.gte.${range.startTs},created_at.lt.${range.endTs})`
      );

      if (seErr) {
        return json({
          reply:
            "Não consegui acessar os lançamentos desse mês agora. Pode ser permissão/configuração. Erro: " +
            String(seErr.message ?? seErr),
        });
      }

      const entries = Array.isArray(seData) ? seData : [];

      let receitasTotal = 0;
      let despesasTotal = 0;
      let openTotal = 0;
      const openLines: Array<{ title: string; remaining: number }> = [];

      for (const e of entries as any[]) {
        const md = (e.metadata ?? {}) as Record<string, unknown>;
        const metaType = typeof md.entry_type === "string" ? md.entry_type : "";
        const amountAbs = Math.abs(Number(e.amount ?? 0));
        const entryType = metaType === "receita" || metaType === "despesa" ? metaType : Number(e.amount ?? 0) < 0 ? "despesa" : "receita";

        if (entryType === "receita") receitasTotal += amountAbs;
        else despesasTotal += amountAbs;

        if (asksOpen && entryType === "receita") {
          const paidFlag = md.paid === true;
          const paidAmount = Number(md.paid_amount ?? 0) || 0;
          const paidEffective = paidFlag ? amountAbs : Math.min(Math.max(paidAmount, 0), amountAbs);
          const remaining = Math.max(0, amountAbs - paidEffective);
          if (remaining > 0) {
            openTotal += remaining;
            openLines.push({ title: String(e.title ?? "(sem título)"), remaining });
          }
        }
      }

      openLines.sort((a, b) => b.remaining - a.remaining);
      const topOpen = openLines.slice(0, 12).map((x) => `- ${x.title}: R$ ${x.remaining.toFixed(2)}`);

      // (B) despesas (tabela) — admin-only
      let expensesTotal = 0;
      let expensesOpenTotal = 0;
      if (isDespesas && role === "admin") {
        const { data: exData, error: exErr } = await db
          .from("expenses")
          .select("id,name,amount,expense_date,paid,metadata")
          .gte("expense_date", range.startDate)
          .lt("expense_date", range.endDate);
        if (!exErr) {
          const expenses = Array.isArray(exData) ? (exData as any[]) : [];
          for (const e of expenses) {
            const total = Number(e.amount ?? 0) || 0;
            expensesTotal += total;
            const md = (e.metadata ?? {}) as Record<string, unknown>;
            const paidAmount = Number(md.paid_amount ?? 0) || 0;
            const paidEffective = e.paid ? total : Math.min(Math.max(paidAmount, 0), total);
            const remaining = Math.max(0, total - paidEffective);
            if (remaining > 0) expensesOpenTotal += remaining;
          }
        }
      }

      const scopeLabel = scopedService && scopedService !== "servicos_variados" ? ` (${scopedService})` : "";
      const lines: string[] = [];
      lines.push(`Miau! Resumo de ${monthKey}${scopeLabel}:`);
      lines.push(`- Receitas: R$ ${receitasTotal.toFixed(2)}`);
      lines.push(`- Despesas (lançamentos): R$ ${despesasTotal.toFixed(2)}`);

      if (isDespesas && role !== "admin") {
        lines.push("- Despesas (tabela despesas): acesso só do admin.");
      }
      if (isDespesas && role === "admin") {
        lines.push(`- Despesas (tabela despesas): R$ ${expensesTotal.toFixed(2)} (em aberto: R$ ${expensesOpenTotal.toFixed(2)})`);
      }

      if (asksOpen) {
        lines.push(`- Falta receber: R$ ${openTotal.toFixed(2)} (${openLines.length} pendência(s))`);
        if (topOpen.length) lines.push(topOpen.join("\n"));
        else lines.push("(Nenhuma pendência de recebimento)");
      }

      return json({ reply: lines.join("\n") });
    }

    // 2) Perguntas gerais: chama IA (sem acesso direto ao banco, exceto o que o usuário perguntou acima)
    const system: ChatMessage = {
      role: "system",
      content:
        "Você é a Chuvinha, a gatinha mascote da MV4 e agente financeira. Fale em pt-BR.\n\nPersonalidade: divertida, carinhosa, com jeitinho de gatinha (pode usar 'miau' e trocadilhos leves), mas SEM exagero e SEM emojis.\n\nEstilo: objetiva, educada e prática. Quando faltar informação, faça 1-2 perguntas curtas. Não invente números.\n\nContexto do app (importante):\n- Existe um filtro de mês (YYYY-MM) nas abas. Se o usuário estiver numa aba de serviço, o contexto pode incluir { service } e { month }.\n- Tabela service_entries guarda lançamentos de serviços (receitas e algumas despesas). Campos: service, title, amount (positivo=receita, negativo=despesa), entry_date, metadata. Em metadata: entry_type ('receita'|'despesa'), paid (boolean), paid_amount (número).\n- Tabela expenses guarda despesas (admin-only) com name, amount, expense_date, paid e metadata.paid_amount.\n- Tabela accounts_payable guarda contas a pagar (admin-only) com vendor, amount, due_date, status ('open'|'paid'|'canceled').\n- Roles: admin vê tudo; employee tem acesso restrito.\n\nRegras: se a pergunta pedir dados do banco e não vier data/mês, peça o mês (YYYY-MM) ou use o contexto se existir. Se pedir 'quem falta pagar', entenda como pendências (a receber ou a pagar) e pergunte se é por serviço/aba ou geral. Nunca finja que consultou dados se você não consultou.",
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
