export type ServiceKey =
  | "melhores_do_ano"
  | "gestao_midias"
  | "premio_excelencia"
  | "carro_de_som"
  | "revista_factus"
  | "revista_saude"
  | "servicos_variados";

export const SERVICE_LABEL: Record<ServiceKey, string> = {
  melhores_do_ano: "Melhores do Ano",
  gestao_midias: "Gestão de Mídias",
  premio_excelencia: "Prêmio Excelência",
  carro_de_som: "Carro de Som",
  revista_factus: "Revista Factus",
  revista_saude: "Factus Saúde",
  servicos_variados: "Serviços Variados",
};

export type ExpenseKind = "fixed" | "variable" | "provision";

export const EXPENSE_KIND_LABEL: Record<ExpenseKind, string> = {
  fixed: "Fixa",
  variable: "Variável",
  provision: "Provisão",
};

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const normalized = value.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
