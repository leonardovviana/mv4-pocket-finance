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
  // Ex: "R$ 1.100,00" -> 1100.00
  const clean = value
    .replace(/R\$\s?/g, "")
    .trim();
  if (!clean) return null;
  const normalized = clean.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  return num;
}

function parseDdMmYyyyToIsoDate(value) {
  const clean = value.trim();
  if (!clean) return null;
  const m = clean.match(/^([0-3]?\d)\/(0?\d|1[0-2])\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return iso;
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

  // Entrada fixa (conforme mensagem do usuário)
  const rows = [
    { title: "GRUPO SAMED", amount: "R$ 1.100,00", date: "10/10/2025" },
    { title: "CLIMAX", amount: "R$ 760,00", date: "15/10/2025" },
    { title: "CDL", amount: "R$ 500,00", date: "20/10/2025" },
    { title: "IDEAL CARNES", amount: "R$ 400,00", date: "20/10/2025" },
    { title: "DUO MEDIC", amount: "R$ 700,00", date: "21/10/2025" },
    { title: "FACIL ENGENHARIA", amount: "R$ 450,00", date: "30/10/2025" },
    { title: "SPEEDING TELECOM", amount: "R$ 350,00", date: "" },
    { title: "RESTAURANTE E POUSADA UNIÃO", amount: "R$ 760,00", date: "30/10/2025" },
  ];

  const payload = rows.map((r) => {
    const amountNum = parsePtBrMoney(r.amount);
    if (amountNum == null) throw new Error(`Valor inválido: ${r.title} -> ${r.amount}`);

    const entryDate = r.date ? parseDdMmYyyyToIsoDate(r.date) : null;

    return {
      user_id: userId,
      service: "gestao_midias",
      title: r.title,
      amount: amountNum.toFixed(2),
      entry_date: entryDate,
      status: "recebido",
      notes: "Receita de mídias sociais",
      metadata: {
        payment_method: "pix",
        paid: true,
        source: "manual",
      },
    };
  });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data, error } = await supabase.from("service_entries").insert(payload).select("id");
  if (error) throw error;

  console.log(JSON.stringify({ inserted: data?.length ?? 0 }, null, 2));
}

main().catch((err) => {
  console.error("ERRO:", err?.message ?? err);
  process.exitCode = 1;
});
