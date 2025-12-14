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

function monthStartIso(from = new Date()) {
  const d = new Date(from);
  d.setDate(1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

function parseMonthKey(value) {
  const s = String(value ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || mm < 1 || mm > 12) return null;
  return { yyyy, mm };
}

function monthKey(yyyy, mm) {
  return `${yyyy}-${String(mm).padStart(2, "0")}`;
}

function monthRange(fromKey, toKey) {
  const a = parseMonthKey(fromKey);
  const b = parseMonthKey(toKey);
  if (!a || !b) return [];

  const start = new Date(a.yyyy, a.mm - 1, 1);
  const end = new Date(b.yyyy, b.mm - 1, 1);
  if (start > end) return [];

  const out = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(monthStartIso(cur));
    cur.setMonth(cur.getMonth() + 1);
    cur.setDate(1);
  }
  return out;
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

async function main() {
  loadDotEnv(path.join(repoRoot, ".env"));

  const argv = process.argv.slice(2);
  const args = new Set(argv);
  const isCommit = args.has("--commit");
  const isDryRun = args.has("--dry-run") || !isCommit;

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Faltando SUPABASE_URL (ou VITE_SUPABASE_URL)." );

  const keyFile = process.env.SUPABASE_SERVICE_ROLE_KEY_FILE ?? path.join(repoRoot, "data", "service_role_key.txt");
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, "utf8").trim() : ""))
    .trim();
  if (!serviceRoleKey) throw new Error("Faltando SUPABASE_SERVICE_ROLE_KEY (ou data/service_role_key.txt)." );

  const userId = process.env.IMPORT_USER_ID?.trim();
  if (!userId) throw new Error("Faltando IMPORT_USER_ID." );

  // Opções:
  // - SEED_MONTH_START=YYYY-MM-01 (mantém comportamento antigo: 1 mês)
  // - SEED_FROM_MONTH=YYYY-MM e SEED_TO_MONTH=YYYY-MM (gera todos os meses do intervalo)
  // - fallback: ano atual inteiro (Jan..mês atual)
  const explicitMonthStart = (process.env.SEED_MONTH_START ?? "").trim();
  const fromMonth = (process.env.SEED_FROM_MONTH ?? "").trim();
  const toMonth = (process.env.SEED_TO_MONTH ?? "").trim();

  const cliFromIdx = argv.indexOf("--from");
  const cliToIdx = argv.indexOf("--to");
  const cliFrom = cliFromIdx !== -1 ? (argv[cliFromIdx + 1] ?? "").trim() : "";
  const cliTo = cliToIdx !== -1 ? (argv[cliToIdx + 1] ?? "").trim() : "";

  const today = new Date();
  const defaultFrom = `${today.getFullYear()}-01`;
  const defaultTo = monthKey(today.getFullYear(), today.getMonth() + 1);

  const monthStarts = cliFrom && cliTo
    ? monthRange(cliFrom, cliTo)
    : explicitMonthStart
      ? [explicitMonthStart]
      : monthRange(fromMonth || defaultFrom, toMonth || defaultTo);

  if (!monthStarts.length) throw new Error("Intervalo de meses inválido. Use SEED_FROM_MONTH=YYYY-MM e SEED_TO_MONTH=YYYY-MM." );

  const items = [
    { name: "GRUPO SAMED", amount: 1100.0 },
    { name: "CLIMAX", amount: 760.0 },
    { name: "CDL", amount: 500.0 },
    { name: "IDEAL CARNES", amount: 400.0 },
    { name: "DUO MEDIC", amount: 700.0 },
    { name: "FACIL ENGENHARIA", amount: 450.0 },
    { name: "SPEEDING TELECOM", amount: 350.0 },
    { name: "RESTAURANTE E POUSADA UNIÃO", amount: 760.0 },
  ];

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const payload = monthStarts.flatMap((expenseDate) =>
    items.map((it) => ({
      user_id: userId,
      amount: it.amount.toFixed(2),
      service: "gestao_midias",
      title: it.name,
      entry_date: expenseDate,
      status: "recebido",
      notes: "Mídias sociais (receita recorrente mensal)",
      metadata: {
        entry_type: "receita",
        paid: true,
        payment_method: "pix",
        recurring: true,
        recurring_rule: "mensal",
        source: "seed-social-recurring",
      },
    }))
  );

  if (isDryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          months: monthStarts.length,
          from: monthStarts[0],
          to: monthStarts[monthStarts.length - 1],
          planned: payload.length,
          sample: payload.slice(0, 5),
        },
        null,
        2
      )
    );
    return;
  }

  // Dedup: mesmo user + service + entry_date + title + amount
  const fromDate = monthStarts[0];
  const toDate = monthStarts[monthStarts.length - 1];
  const { data: existing, error: existingError } = await supabase
    .from("service_entries")
    .select("service,entry_date,title,amount")
    .eq("user_id", userId)
    .eq("service", "gestao_midias")
    .gte("entry_date", fromDate)
    .lte("entry_date", toDate);
  if (existingError) throw existingError;

  const existingKeys = new Set((existing ?? []).map((r) => `${r.service}|${r.entry_date ?? ""}|${r.title}|${r.amount}`));
  const uniquePayload = payload.filter((p) => !existingKeys.has(`${p.service}|${p.entry_date ?? ""}|${p.title}|${p.amount}`));

  const batches = chunk(uniquePayload, 250);
  let inserted = 0;
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const { error } = await supabase.from("service_entries").insert(batch);
    if (error) throw error;
    inserted += batch.length;
  }

  console.log(
    JSON.stringify(
      {
        inserted,
        deduped: payload.length - uniquePayload.length,
        months: monthStarts.length,
        from: monthStarts[0],
        to: monthStarts[monthStarts.length - 1],
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("ERRO:", err?.message ?? err);
  process.exitCode = 1;
});
