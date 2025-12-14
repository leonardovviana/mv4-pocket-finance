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

function parsePtBrMoney(value) {
  // Ex: "1.324,00" -> 1324.00
  const clean = value.trim();
  if (!clean) return null;
  const normalized = clean.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  return num;
}

function parseDdMmToIsoDate(ddmm, year) {
  const clean = ddmm.trim();
  const m = clean.match(/^([0-3]?\d)\/(0?\d|1[0-2])$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  if (day < 1 || day > 31) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return iso;
}

function splitColumns(line) {
  // Prefer tabs; fallback to 2+ spaces
  if (line.includes("\t")) return line.split("\t").map((s) => s.trim());
  return line.split(/\s{2,}/).map((s) => s.trim());
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

async function main() {
  loadDotEnv(path.join(repoRoot, ".env"));

  const args = process.argv.slice(2);
  const isCommit = args.includes("--commit");
  const inputArg = args.find((a) => a.startsWith("--input="));
  const inputPath = inputArg
    ? inputArg.slice("--input=".length)
    : path.join(repoRoot, "data", "despesas.txt");

  const year = Number(process.env.IMPORT_YEAR ?? new Date().getFullYear());

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const serviceRoleKeyFile =
    process.env.SUPABASE_SERVICE_ROLE_KEY_FILE ??
    path.join(repoRoot, "data", "service_role_key.txt");

  if (!supabaseUrl) {
    throw new Error("Faltando SUPABASE_URL (ou VITE_SUPABASE_URL no .env)." );
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }

  if (!serviceRoleKey && fs.existsSync(serviceRoleKeyFile)) {
    serviceRoleKey = fs.readFileSync(serviceRoleKeyFile, "utf8").trim();
  }

  const raw = fs.readFileSync(inputPath, "utf8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  let supabase;
  let userId;

  if (serviceRoleKey) {
    const targetUserId = process.env.IMPORT_USER_ID?.trim();
    if (!targetUserId) {
      throw new Error(
        "Modo Service Role: defina IMPORT_USER_ID (uuid do usuário dono das despesas)."
      );
    }

    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    userId = targetUserId;
  } else {
    if (!supabaseAnonKey) {
      throw new Error(
        "Modo Login: faltando VITE_SUPABASE_PUBLISHABLE_KEY no .env."
      );
    }

    const email = process.env.IMPORT_EMAIL;
    const password = process.env.IMPORT_PASSWORD;
    if (!email || !password) {
      throw new Error(
        "Modo Login: defina IMPORT_EMAIL e IMPORT_PASSWORD (ou use SUPABASE_SERVICE_ROLE_KEY + IMPORT_USER_ID)."
      );
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) throw authError;
    userId = authData.user?.id;
    if (!userId) throw new Error("Não foi possível obter o user id após login.");
  }

  const parsed = [];
  const skipped = [];

  for (const line of lines) {
    const cols = splitColumns(line);
    if (cols.length < 2) continue;

    // Header
    if (cols[0].toUpperCase() === "DESPESA") continue;

    const name = (cols[0] ?? "").trim();
    const amountRaw = (cols[1] ?? "").trim();
    const dateRaw = (cols[2] ?? "").trim();

    const amount = parsePtBrMoney(amountRaw);
    const expense_date = parseDdMmToIsoDate(dateRaw, year);

    if (!name || amount == null || expense_date == null) {
      skipped.push({ line, reason: `name=${Boolean(name)} amount=${amountRaw} date=${dateRaw}` });
      continue;
    }

    parsed.push({
      user_id: userId,
      kind: "variable",
      name,
      amount: amount.toFixed(2),
      expense_date,
      due_day: null,
      paid: false,
      cost_center: null,
      payment_method: null,
      installments: null,
      recurring: false,
      recurring_rule: null,
      receipt_url: null,
      notes: null,
      metadata: {},
    });
  }

  console.log(`Arquivo: ${inputPath}`);
  console.log(`Ano assumido para datas DD/MM: ${year}`);
  console.log(`Usuário destino (auth.uid): ${userId}`);
  console.log(`Linhas lidas: ${lines.length}`);
  console.log(`Registros prontos para inserir: ${parsed.length}`);
  console.log(`Registros ignorados: ${skipped.length}`);

  if (skipped.length) {
    console.log("\nPrimeiros ignorados (até 10):");
    for (const item of skipped.slice(0, 10)) console.log("-", item.reason, "|", item.line);
  }

  console.log("\nAmostra (até 5):");
  for (const item of parsed.slice(0, 5)) console.log(item);

  if (!isCommit) {
    console.log("\nDRY-RUN: nada foi inserido. Use --commit para inserir.");
    return;
  }

  const batches = chunk(parsed, 250);
  let inserted = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const { error } = await supabase.from("expenses").insert(batch);
    if (error) throw error;
    inserted += batch.length;
    console.log(`Inserido lote ${i + 1}/${batches.length} (total=${inserted})`);
  }

  console.log(`\nOK: inseridos ${inserted} registros em expenses.`);
}

main().catch((err) => {
  console.error("\nERRO:", err?.message ?? err);
  process.exitCode = 1;
});
