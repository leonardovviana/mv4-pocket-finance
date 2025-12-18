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

function parseMonthKey(value) {
  const s = String(value ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || mm < 1 || mm > 12) return null;
  return { yyyy, mm };
}

function monthStartIso(yyyy, mm) {
  return `${yyyy}-${String(mm).padStart(2, "0")}-01`;
}

function monthStarts(fromKey, toKey) {
  const a = parseMonthKey(fromKey);
  const b = parseMonthKey(toKey);
  if (!a || !b) return [];

  const start = new Date(a.yyyy, a.mm - 1, 1);
  const end = new Date(b.yyyy, b.mm - 1, 1);
  if (start > end) return [];

  const out = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(monthStartIso(cur.getFullYear(), cur.getMonth() + 1));
    cur.setMonth(cur.getMonth() + 1);
    cur.setDate(1);
  }
  return out;
}

async function main() {
  loadDotEnv(path.join(repoRoot, ".env"));

  const argv = process.argv.slice(2);
  const args = new Set(argv);
  const isCommit = args.has("--commit");
  const isDryRun = args.has("--dry-run") || !isCommit;

  const fromIdx = argv.indexOf("--from");
  const toIdx = argv.indexOf("--to");
  const fromKey = (fromIdx !== -1 ? argv[fromIdx + 1] : "")?.trim() || "2025-01";
  const toKey = (toIdx !== -1 ? argv[toIdx + 1] : "")?.trim() || "2025-12";

  const months = monthStarts(fromKey, toKey);
  if (!months.length) throw new Error("Intervalo inválido. Use --from YYYY-MM --to YYYY-MM");

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Faltando SUPABASE_URL (ou VITE_SUPABASE_URL)." );

  const keyFile = process.env.SUPABASE_SERVICE_ROLE_KEY_FILE ?? path.join(repoRoot, "data", "service_role_key.txt");
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, "utf8").trim() : "")).trim();
  if (!serviceRoleKey) throw new Error("Faltando SUPABASE_SERVICE_ROLE_KEY (ou data/service_role_key.txt)." );

  const userId = process.env.IMPORT_USER_ID?.trim();
  if (!userId) throw new Error("Faltando IMPORT_USER_ID." );

  const fromDate = months[0];
  const toDate = months[months.length - 1];

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const base = supabase
    .from("expenses")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .eq("cost_center", "midias_sociais")
    .gte("expense_date", fromDate)
    .lte("expense_date", toDate)
    // garante que só remove o que foi seedado pelo script
    .contains("metadata", { source: "seed-social-recurring" });

  if (isDryRun) {
    // PostgREST não retorna count sem executar delete; então fazemos um select count aproximado.
    const { count, error } = await supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("cost_center", "midias_sociais")
      .gte("expense_date", fromDate)
      .lte("expense_date", toDate)
      .contains("metadata", { source: "seed-social-recurring" });
    if (error) throw error;

    console.log(JSON.stringify({ dryRun: true, fromDate, toDate, toDelete: count ?? 0 }, null, 2));
    return;
  }

  const { count, error } = await base;
  if (error) throw error;

  console.log(JSON.stringify({ deleted: count ?? 0, fromDate, toDate }, null, 2));
}

main().catch((err) => {
  console.error("ERRO:", err?.message ?? err);
  process.exitCode = 1;
});
