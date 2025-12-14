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
      return path.join(repoRoot, "data", "despesas-melhores-do-ano-2025-11-29.txt");
    })(),
  };
}

function parsePtBrMoneyToNumber(value) {
  const clean = String(value)
    .replace(/R\$\s?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean || clean === "-" || clean === "R$ -") return null;
  const normalized = clean.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

const MONTHS = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12,
};

function parsePtBrDateToIso(value) {
  const s = String(value).trim();
  if (!s) return null;

  // dd/mm/yyyy
  let m = s.match(/^([0-3]?\d)\/(0?\d|1[0-2])\/(\d{4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  // dd/mmm/yyyy
  m = s.match(/^([0-3]?\d)\/([a-zç]{3})\/(\d{4})$/i);
  if (m) {
    const dd = Number(m[1]);
    const mon = m[2].toLowerCase();
    const yyyy = Number(m[3]);
    const mm = MONTHS[mon];
    if (!mm) return null;
    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  return null;
}

function splitColumns(line) {
  if (line.includes("\t")) return line.split("\t").map((s) => s.trim());
  return line.split(/\s{2,}/).map((s) => s.trim());
}

function normalizePaymentMethod(value) {
  const s = String(value ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.includes("pix")) return "pix";
  if (s.includes("din")) return "dinheiro";
  if (s.includes("cart")) return "cartao";
  if (s.includes("bole")) return "boleto";
  if (s.includes("cheq")) return "cheque";
  return s;
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
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

  let expenseDate = null;
  const parsed = [];
  const skipped = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Header com data
    const headerMatch = line.match(/DESPESAS\s*-\s*MELHORES\s*DO\s*ANO\s+(\S+)/i);
    if (headerMatch) {
      expenseDate = parsePtBrDateToIso(headerMatch[1]);
      continue;
    }

    const cols = splitColumns(line);
    if (!cols.length) continue;

    // Cabeçalho da tabela
    if ((cols[0] ?? "").toUpperCase().startsWith("N")) continue;

    // Esperado: N | EMPRESA | DESPESA | VALOR | VALOR PAGO | RESTA | FORMA
    // mas podem faltar colunas (ex: valor pago vazio).
    const idx = String(cols[0] ?? "").replace(/\D/g, "");
    if (!idx) continue;

    const empresa = (cols[1] ?? "").trim();
    const despesa = (cols[2] ?? "").trim();
    const valor = parsePtBrMoneyToNumber(cols[3] ?? "");
    const valorPago = parsePtBrMoneyToNumber(cols[4] ?? "");
    const resta = parsePtBrMoneyToNumber(cols[5] ?? "");
    const forma = (cols[6] ?? "").trim();

    if (!empresa || valor == null) {
      skipped.push({ reason: "sem empresa/valor", line });
      continue;
    }
    if (!expenseDate) {
      skipped.push({ reason: "sem data no cabeçalho", line });
      continue;
    }

    const name = despesa ? `${empresa} - ${despesa}` : empresa;
    const remaining = resta == null ? 0 : resta;
    const paid = remaining <= 0.02;

    parsed.push({
      user_id: userId,
      kind: "variable",
      name,
      amount: valor.toFixed(2),
      expense_date: expenseDate,
      due_day: null,
      paid,
      cost_center: "melhores_do_ano",
      payment_method: normalizePaymentMethod(forma),
      installments: null,
      recurring: false,
      recurring_rule: null,
      receipt_url: null,
      notes: null,
      metadata: {
        source: "import-despesas-melhores-do-ano",
        table: "despesas_melhores_do_ano",
        empresa,
        despesa: despesa || undefined,
        valor_pago: valorPago ?? undefined,
        remaining: remaining ?? undefined,
        forma_pg: forma || undefined,
        raw: line,
      },
    });
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          file,
          expenseDate,
          parsed: parsed.length,
          skipped: skipped.length,
          sample: parsed.slice(0, 5),
          skippedSample: skipped.slice(0, 10),
        },
        null,
        2
      )
    );
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Dedup: mesmo user + cost_center + expense_date + name + amount
  const { data: existing, error: existingError } = await supabase
    .from("expenses")
    .select("cost_center,expense_date,name,amount")
    .eq("user_id", userId)
    .eq("cost_center", "melhores_do_ano")
    .eq("expense_date", expenseDate);
  if (existingError) throw existingError;

  const existingKeys = new Set((existing ?? []).map((r) => `${r.cost_center}|${r.expense_date}|${r.name}|${r.amount}`));
  const uniqueParsed = parsed.filter((p) => !existingKeys.has(`${p.cost_center}|${p.expense_date}|${p.name}|${p.amount}`));

  const batches = chunk(uniqueParsed, 250);
  let inserted = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const { error } = await supabase.from("expenses").insert(batch);
    if (error) throw error;
    inserted += batch.length;
    console.log(`Inserido lote ${i + 1}/${batches.length} (total=${inserted})`);
  }

  console.log(JSON.stringify({ inserted, deduped: parsed.length - uniqueParsed.length, expenseDate }, null, 2));
}

main().catch((err) => {
  console.error("ERRO:", err?.message ?? err);
  process.exitCode = 1;
});
