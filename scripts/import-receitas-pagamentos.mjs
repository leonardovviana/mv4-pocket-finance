import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function loadDotEnv(dotenvPath) {
  if (!fs.existsSync(dotenvPath)) return;
  const content = fs.readFileSync(dotenvPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    commit: args.has("--commit"),
    dryRun: args.has("--dry-run") || !args.has("--commit"),
    file: (() => {
      const idx = argv.indexOf("--file");
      if (idx !== -1 && argv[idx + 1]) return argv[idx + 1];
      return path.join(repoRoot, "data", "receitas.txt");
    })(),
  };
}

function parsePtBrMoneyToNumber(value) {
  const clean = String(value)
    .replace(/R\$\s?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return null;
  const normalized = clean.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function parseDdMmYyyyToIsoDate(value) {
  const clean = value.trim();
  const m = clean.match(/^([0-3]?\d)\/(0?\d|1[0-2])\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function findDateIndex(cols) {
  for (let i = 0; i < cols.length; i++) {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(cols[i])) return i;
  }
  return -1;
}

function extractMoneyValues(cols, startIndexInclusive = 0) {
  const out = [];
  for (let i = startIndexInclusive; i < cols.length; i++) {
    const v = parsePtBrMoneyToNumber(cols[i]);
    if (v != null) out.push({ index: i, value: v });
  }
  return out;
}

function pickFormaPg(cols, startIndexInclusive = 0) {
  for (let i = startIndexInclusive; i < cols.length; i++) {
    const token = cols[i];
    if (!token) continue;
    if (parsePtBrMoneyToNumber(token) != null) continue;
    // códigos curtos comuns no dump: AV/AP
    if (/^(AV|AP)$/i.test(token)) return token;
    // textos curtos que parecem forma/meio
    if (/^(PIX|CART(A|Ã)O|BOLETO|CHEQUE)$/i.test(token)) return token;
  }
  return "";
}

function extractFirstDate(line) {
  const m = line.match(/\b([0-3]?\d\/(0?\d|1[0-2])\/\d{4})\b/);
  return m ? m[1] : null;
}

function extractAllMoney(line) {
  const matches = Array.from(line.matchAll(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,\d{2})/g));
  return matches
    .map((m) => parsePtBrMoneyToNumber(m[1]))
    .filter((n) => typeof n === "number" && Number.isFinite(n));
}

function detectPaymentMethod(line) {
  const s = line.toUpperCase();
  if (s.includes("PIX")) return "pix";
  if (s.includes("CART")) return "cartao";
  if (s.includes("BOLETO")) return "boleto";
  if (s.includes("CHEQUE")) return "cheque";
  return "outro";
}

function detectInstallments(line) {
  const m = line.match(/\b(\d{1,3})\s*X\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 1 && n <= 360 ? n : null;
}

function normalizeAccount(value) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (v === "R$" || v === "R$-" || v === "R$ -") return "";
  return v;
}

function stripLeadingIndex(line) {
  return line.replace(/^\s*\d+\s+/, "").trim();
}

function parseTitle(line) {
  const noIdx = stripLeadingIndex(line);
  const date = extractFirstDate(noIdx);
  if (!date) {
    // tenta cortar em "PERMUTA" / "PIX" / "CARTÃO" etc, senão pega tudo até o primeiro R$
    const cutKeyword = noIdx.search(/\b(PERMUTA|PIX|CART|CHEQUE|BOLETO)\b/i);
    if (cutKeyword > 0) return noIdx.slice(0, cutKeyword).trim();
    const cutMoney = noIdx.search(/R\$\s*[0-9]/i);
    if (cutMoney > 0) return noIdx.slice(0, cutMoney).trim();
    return noIdx.trim();
  }

  const beforeDate = noIdx.slice(0, noIdx.indexOf(date)).trim();
  // antes da data ainda tem "CONTA OU R$" (PIX, CARTÃO etc). Vamos separar por tokens e pegar o início.
  // estratégia simples: remover o último “bloco” (account) quando parece forma de pagamento.
  const parts = beforeDate.split(/\s{2,}|\t+/).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (/\b(PIX|CART|CHEQUE|BOLETO|R\$)\b/i.test(last)) {
      return parts.slice(0, -1).join(" ").trim();
    }
  }
  return beforeDate.trim();
}

function computePaid(valor, monies) {
  if (valor == null) return { paid: false, totalPaid: null, remaining: null };
  if (monies.length < 2) return { paid: true, totalPaid: valor, remaining: 0 };

  const last = monies[monies.length - 1];
  const secondLast = monies[monies.length - 2];
  const eps = 0.02;

  // Heurística: se (secondLast + last) ~ valor, então secondLast=total_pg e last=restante
  if (Math.abs((secondLast + last) - valor) <= eps) {
    const totalPaid = secondLast;
    const remaining = last;
    return { paid: remaining <= eps, totalPaid, remaining };
  }

  // Senão, assume último é total_pg
  const totalPaid = last;
  const remaining = Math.max(0, valor - totalPaid);
  return { paid: remaining <= eps, totalPaid, remaining };
}

function normalizeLine(line) {
  // preserva tabs (TSV) e compacta apenas espaços repetidos
  return line.replace(/\t+/g, "\t").replace(/[ ]{2,}/g, " ").trim();
}

function isHeaderLine(line) {
  const s = line.trim();
  if (!s) return false;
  const upper = s.toUpperCase();
  if (upper.startsWith("CLIENTE\t") || upper.startsWith("CLIENTE ")) return true;
  if (upper.startsWith("N°\t") || upper.startsWith("N° ") || upper.startsWith("NO\t") || upper.startsWith("NO ")) return true;
  if (upper.includes("VENCEDOR") && upper.includes("CONTA") && upper.includes("VALOR")) return true;
  return false;
}

async function main() {
  loadDotEnv(path.join(repoRoot, ".env"));

  const { dryRun, file } = parseArgs(process.argv);
  if (!fs.existsSync(file)) throw new Error(`Arquivo não encontrado: ${file}`);

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Faltando SUPABASE_URL (ou VITE_SUPABASE_URL)." );

  const keyFile = process.env.SUPABASE_SERVICE_ROLE_KEY_FILE ?? path.join(repoRoot, "data", "service_role_key.txt");
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, "utf8").trim() : "")).trim();
  if (!serviceRoleKey) throw new Error("Faltando SUPABASE_SERVICE_ROLE_KEY (ou data/service_role_key.txt)." );

  const userId = process.env.IMPORT_USER_ID?.trim();
  if (!userId) throw new Error("Faltando IMPORT_USER_ID." );

  const raw = fs.readFileSync(file, "utf8");
  const lines = raw.split(/\r?\n/).map((l) => l.trimEnd());

  let currentService = null;
  /** @type {Array<any>} */
  const parsed = [];
  const skipped = [];

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    if (!line) continue;
    if (line.startsWith("#")) continue;

    if (/REVISTA/i.test(line) && /SA[UÚ]DE/i.test(line)) {
      currentService = "revista_saude";
      continue;
    }
    if (/PREMIO/i.test(line) && /MELHORES/i.test(line)) {
      currentService = "melhores_do_ano";
      continue;
    }

    // pular cabeçalhos
    if (isHeaderLine(line)) continue;

    if (!currentService) continue;

    // Preferir TSV (arquivo colado em formato tabulado)
    if (line.includes("\t")) {
      const cols = line.split("\t").map((c) => c.trim());

      if (currentService === "revista_saude") {
        // Layout pode variar; usa DATA como âncora e pega valores monetários após ela.
        const title = cols[0] ?? "";
        const dateIndex = findDateIndex(cols);
        const dateStr = dateIndex >= 0 ? cols[dateIndex] : "";
        const account = normalizeAccount(cols[1] ?? "");

        const money = extractMoneyValues(cols, Math.max(0, dateIndex + 1));
        const valor = money.length ? money[0].value : null;
        const totalPaid = money.length ? money[money.length - 1].value : null;
        const remaining = valor != null && totalPaid != null ? Math.max(0, valor - totalPaid) : null;

        const formaPg = pickFormaPg(cols, Math.max(0, dateIndex + 1));
        const parc1 = money[0]?.value ?? null;
        const parc2 = money[1]?.value ?? null;
        const parc3 = money[2]?.value ?? null;

        if (!title || title.length < 2) {
          skipped.push({ reason: "sem título", line });
          continue;
        }

        if (valor == null) {
          skipped.push({ reason: "sem valor", line });
          continue;
        }

        const entryDate = dateStr ? parseDdMmYyyyToIsoDate(dateStr) : null;

        const installments = detectInstallments(account) ?? detectInstallments(line);
        const paymentMethod = detectPaymentMethod(`${account} ${formaPg}`);
        const paid = remaining == null ? true : remaining <= 0.02;
        const status = paid ? "recebido" : "pendente";

        parsed.push({
          user_id: userId,
          service: currentService,
          title,
          amount: valor == null ? null : valor.toFixed(2),
          entry_date: entryDate,
          status,
          notes: null,
          metadata: {
            entry_type: "receita",
            paid,
            payment_method: paymentMethod,
            installments: installments ?? undefined,
            account: account || undefined,
            forma_pg: formaPg || undefined,
            parc1: parc1 ?? undefined,
            parc2: parc2 ?? undefined,
            parc3: parc3 ?? undefined,
            total_paid: totalPaid ?? undefined,
            remaining: remaining ?? undefined,
            source: "import-receitas-pagamentos",
            raw: line,
          },
        });

        continue;
      }

      if (currentService === "melhores_do_ano") {
        // Layout pode variar; usa DATA como âncora e pega valores monetários após ela.
        const title = cols[1] ?? "";
        const account = normalizeAccount(cols[2] ?? "");
        const dateIndex = findDateIndex(cols);
        const dateStr = dateIndex >= 0 ? cols[dateIndex] : "";

        const money = extractMoneyValues(cols, Math.max(0, dateIndex + 1));
        const valor = money.length ? money[0].value : null;
        const totalPaid = money.length ? money[money.length - 1].value : null;
        const remaining = valor != null && totalPaid != null ? Math.max(0, valor - totalPaid) : null;

        const formaPg = pickFormaPg(cols, Math.max(0, dateIndex + 1));
        const parc1 = money[0]?.value ?? null;
        const parc2 = money[1]?.value ?? null;
        const parc3 = money[2]?.value ?? null;
        const senExt = cols.length ? cols[cols.length - 1] : "";

        if (!title || title.length < 2) {
          skipped.push({ reason: "sem título", line });
          continue;
        }

        if (valor == null) {
          skipped.push({ reason: "sem valor", line });
          continue;
        }

        const entryDate = dateStr ? parseDdMmYyyyToIsoDate(dateStr) : null;

        const installments = detectInstallments(account) ?? detectInstallments(line);
        const paymentMethod = detectPaymentMethod(`${account} ${formaPg}`);
        const paid = remaining == null ? true : remaining <= 0.02;
        const status = paid ? "recebido" : "pendente";

        parsed.push({
          user_id: userId,
          service: currentService,
          title,
          amount: valor == null ? null : valor.toFixed(2),
          entry_date: entryDate,
          status,
          notes: null,
          metadata: {
            entry_type: "receita",
            paid,
            payment_method: paymentMethod,
            installments: installments ?? undefined,
            account: account || undefined,
            forma_pg: formaPg || undefined,
            parc1: parc1 ?? undefined,
            parc2: parc2 ?? undefined,
            parc3: parc3 ?? undefined,
            total_paid: totalPaid ?? undefined,
            remaining: remaining ?? undefined,
            sen_ext: senExt || undefined,
            source: "import-receitas-pagamentos",
            raw: line,
          },
        });

        continue;
      }
    }

    // Fallback (texto não tabulado)
    const dateStr = extractFirstDate(line);
    const entryDate = dateStr ? parseDdMmYyyyToIsoDate(dateStr) : null;

    const monies = extractAllMoney(line);
    const valor = monies.length ? monies[0] : null;

    const title = parseTitle(line);

    if (!title || title.length < 2) {
      skipped.push({ reason: "sem título", line });
      continue;
    }

    if (valor == null) {
      skipped.push({ reason: "sem valor", line });
      continue;
    }

    const installments = detectInstallments(line);
    const paymentMethod = detectPaymentMethod(line);

    const { paid, totalPaid, remaining } = computePaid(valor, monies);
    const status = paid ? "recebido" : "pendente";

    parsed.push({
      user_id: userId,
      service: currentService,
      title,
      amount: valor == null ? null : valor.toFixed(2),
      entry_date: entryDate,
      status,
      notes: null,
      metadata: {
        entry_type: "receita",
        paid,
        payment_method: paymentMethod,
        installments: installments ?? undefined,
        total_paid: totalPaid ?? undefined,
        remaining: remaining ?? undefined,
        source: "import-receitas-pagamentos",
        raw: line,
      },
    });
  }

  if (dryRun) {
    console.log(JSON.stringify({ file, parsed: parsed.length, skipped: skipped.length, sample: parsed.slice(0, 5), skippedSample: skipped.slice(0, 10) }, null, 2));
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Dedup simples (evita reimportar o mesmo arquivo)
  const services = Array.from(new Set(parsed.map((p) => p.service)));
  const { data: existing, error: existingError } = await supabase
    .from("service_entries")
    .select("service,title,amount,entry_date")
    .eq("user_id", userId)
    .in("service", services);
  if (existingError) throw existingError;

  const existingKeys = new Set(
    (existing ?? []).map((r) => `${r.service}|${r.title}|${r.entry_date ?? ""}|${r.amount}`)
  );
  const uniqueParsed = parsed.filter((p) => !existingKeys.has(`${p.service}|${p.title}|${p.entry_date ?? ""}|${p.amount}`));

  const { data, error } = await supabase.from("service_entries").insert(uniqueParsed).select("id");
  if (error) throw error;

  console.log(JSON.stringify({ inserted: data?.length ?? 0, deduped: parsed.length - uniqueParsed.length, skipped: skipped.length }, null, 2));
}

main().catch((err) => {
  console.error("ERRO:", err?.message ?? err);
  process.exitCode = 1;
});
