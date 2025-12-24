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

function detectPaid(input: string): boolean {
  const t = normalizeText(input);
  if (/(nao\s+pag|ainda\s+nao\s+pag|em\s+aberto|pendente)/.test(t)) return false;
  if (/(ja\s+pag|pago|quitad)/.test(t)) return true;
  return false;
}

function detectRecurringRule(input: string): string | null {
  const t = normalizeText(input);
  if (/mensal/.test(t)) return "mensal";
  if (/semanal/.test(t)) return "semanal";
  if (/anual/.test(t)) return "anual";
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

  const cut = rest.search(/\b(valor|r\$|mensal|semanal|anual|em\s+|para\s+|no\s+|na\s+|ainda\s+|ja\s+|pago|pagou|nao\s+pagou|não\s+pagou)\b/i);
  const title = (cut >= 0 ? rest.slice(0, cut) : rest).trim();
  return title ? title : null;
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

    // 0) Comandos de cadastro
    if (/^(\s*)(cadastre|cadastrar)\b/i.test(question)) {
      const amount = parseMoneyBRLFromText(question);
      const title = extractTitleAfterVerb(question);
      const service = detectServiceKey(question);
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
        .select("id")
        .single();

      if (insertError) {
        return json({
          reply:
            "Miau… tentei cadastrar, mas deu erro no banco: " + String(insertError.message ?? insertError),
        });
      }

      const paidLabel = paid ? "pago" : "em aberto";
      const recLabel = recurringRule ? ` (${recurringRule})` : "";
      return json({
        reply:
          `Miau! Cadastrei pra você: '${title}' em ${service}, R$ ${amount.toFixed(2)}${recLabel}, ${paidLabel}. (id: ${inserted?.id})`,
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

    // 2) Perguntas gerais: chama IA (sem acesso direto ao banco, exceto o que o usuário perguntou acima)
    const system: ChatMessage = {
      role: "system",
      content:
        "Você é a Chuvinha, a gatinha mascote da MV4 e agente financeira. Fale em pt-BR.\n\nPersonalidade: divertida, carinhosa, com jeitinho de gatinha (pode usar 'miau', trocadilhos leves e frases curtinhas), mas SEM exagero e SEM emojis.\n\nEstilo: objetiva, educada e prática. Quando faltar informação, faça 1-2 perguntas curtas. Não invente números.\n\nRegras: se a pergunta pedir dados do banco, você deve pedir a data/serviço/conta para que o sistema consulte; não finja que viu dados. Se a resposta for sobre permissão/role, explique de forma clara e amigável.",
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
