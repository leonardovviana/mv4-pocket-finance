import type { ServiceKey } from "@/lib/domain";

export type ServiceExtraField =
  | { key: "plan_type"; label: string; type: "text" }
  | { key: "platform"; label: string; type: "text" }
  | { key: "handle"; label: string; type: "text" }
  | { key: "started_at"; label: string; type: "date" }
  | { key: "city"; label: string; type: "text" }
  | { key: "hours"; label: string; type: "number" }
  | { key: "route"; label: string; type: "text" }
  | { key: "audio_script"; label: string; type: "text" }
  | { key: "driver"; label: string; type: "text" }
  | { key: "edition"; label: string; type: "text" }
  | { key: "page"; label: string; type: "text" }
  | { key: "award_type"; label: string; type: "text" };

export type ServiceEntryConfig = {
  titleLabel: string;
  titlePlaceholder?: string;
  amountLabel?: string;
  entryDateLabel?: string;
  extraFields: ServiceExtraField[];
};

export const SERVICE_ENTRY_CONFIG: Record<ServiceKey, ServiceEntryConfig> = {
  gestao_midias: {
    titleLabel: "Cliente",
    titlePlaceholder: "Nome do cliente",
    amountLabel: "Mensalidade (R$)",
    entryDateLabel: "Data de pagamento",
    extraFields: [
      { key: "plan_type", label: "Plano mensal", type: "text" },
      { key: "platform", label: "Plataforma", type: "text" },
      { key: "handle", label: "@user", type: "text" },
      { key: "started_at", label: "Início do serviço", type: "date" },
    ],
  },
  carro_de_som: {
    titleLabel: "Cliente",
    titlePlaceholder: "Nome do cliente",
    amountLabel: "Valor (R$)",
    entryDateLabel: "Data",
    extraFields: [
      { key: "city", label: "Cidade/Bairro", type: "text" },
      { key: "hours", label: "Horas", type: "number" },
      { key: "route", label: "Rota", type: "text" },
      { key: "audio_script", label: "Áudio/Script", type: "text" },
      { key: "driver", label: "Motorista", type: "text" },
    ],
  },
  revista_factus: {
    titleLabel: "Anunciante",
    titlePlaceholder: "Nome do anunciante",
    amountLabel: "Valor (R$)",
    entryDateLabel: "Data (opcional)",
    extraFields: [
      { key: "edition", label: "Edição", type: "text" },
      { key: "page", label: "Página", type: "text" },
    ],
  },
  melhores_do_ano: {
    titleLabel: "Vencedor",
    titlePlaceholder: "Nome do vencedor",
    amountLabel: "Valor do pacote (R$)",
    entryDateLabel: "Data (opcional)",
    extraFields: [{ key: "award_type", label: "Tipo de premiação", type: "text" }],
  },
  premio_excelencia: {
    titleLabel: "Vencedor",
    titlePlaceholder: "Nome do vencedor",
    amountLabel: "Valor do pacote (R$)",
    entryDateLabel: "Data (opcional)",
    extraFields: [{ key: "award_type", label: "Tipo de premiação", type: "text" }],
  },
  revista_saude: {
    titleLabel: "Título",
    titlePlaceholder: "Descreva o cadastro",
    amountLabel: "Valor (opcional)",
    entryDateLabel: "Data (opcional)",
    extraFields: [],
  },
  servicos_variados: {
    titleLabel: "Título",
    titlePlaceholder: "Descreva o cadastro",
    amountLabel: "Valor (opcional)",
    entryDateLabel: "Data (opcional)",
    extraFields: [],
  },
};
