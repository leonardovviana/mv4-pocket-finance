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

async function main() {
  loadDotEnv(path.join(repoRoot, ".env"));

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Faltando SUPABASE_URL (ou VITE_SUPABASE_URL)." );

  const keyFile = process.env.SUPABASE_SERVICE_ROLE_KEY_FILE ?? path.join(repoRoot, "data", "service_role_key.txt");
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, "utf8").trim() : ""))
    .trim();
  if (!serviceRoleKey) throw new Error("Faltando SUPABASE_SERVICE_ROLE_KEY (ou data/service_role_key.txt)." );

  const userId = process.env.IMPORT_USER_ID?.trim();
  if (!userId) throw new Error("Faltando IMPORT_USER_ID." );

  // Default: intervalo do que foi importado (Out-Dez/2025)
  const fromDate = (process.env.FROM_DATE ?? "2025-10-01").trim();
  const toDate = (process.env.TO_DATE ?? "2025-12-31").trim();

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Update only what looks like the imported batch (unpaid and without payment method)
  const { data, error } = await supabase
    .from("expenses")
    .update({ paid: true, payment_method: "pix" })
    .eq("user_id", userId)
    .gte("expense_date", fromDate)
    .lte("expense_date", toDate)
    .eq("paid", false)
    .is("payment_method", null)
    .select("id");

  if (error) throw error;

  console.log(JSON.stringify({ updated: data?.length ?? 0, fromDate, toDate }, null, 2));
}

main().catch((err) => {
  console.error("ERRO:", err?.message ?? err);
  process.exitCode = 1;
});
