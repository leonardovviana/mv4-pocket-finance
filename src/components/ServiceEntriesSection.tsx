import { IOSCardGroup, IOSListItem, IOSSectionHeader } from "@/components/IOSCard";
import { IOSStatCard } from "@/components/IOSStatCard";
import { MonthFilter } from "@/components/MonthFilter";
import { ServiceEntryDialog } from "@/components/ServiceEntryDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMonthFilter } from "@/hooks/useMonthFilter";
import type { ServiceEntry } from "@/hooks/useServiceEntries";
import { useDeleteServiceEntry, useServiceEntries, useUpsertServiceEntry } from "@/hooks/useServiceEntries";
import { formatBRL, parseNumeric, type ServiceKey } from "@/lib/domain";
import { SERVICE_ENTRY_CONFIG } from "@/lib/serviceEntryConfig";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Plus } from "lucide-react";
import { useMemo, useState } from "react";

function getPaymentInfo(entry: ServiceEntry) {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  const totalAbs = Math.abs(parseNumeric(entry.amount) ?? 0);
  const paidFlag = metadata.paid === true;
  const paidAmountMeta = parseNumeric(metadata.paid_amount) ?? 0;
  const paidAmountEffective =
    totalAbs > 0
      ? paidFlag
        ? totalAbs
        : Math.min(Math.max(paidAmountMeta, 0), totalAbs)
      : 0;
  const remaining = totalAbs > 0 ? Math.max(0, totalAbs - paidAmountEffective) : 0;
  const isPaid = totalAbs > 0 ? remaining <= 0 : paidFlag;
  const isPartial = !isPaid && paidAmountEffective > 0 && remaining > 0;
  return { isPaid, isPartial, remaining, paidAmount: paidAmountEffective, totalAbs };
}

function hasReceipt(entry: ServiceEntry) {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  return typeof metadata.receipt_path === "string" && metadata.receipt_path.trim().length > 0;
}

function getMetaString(metadata: Record<string, unknown>, key: string) {
  const v = metadata[key];
  return typeof v === "string" ? v : "";
}

function getMetaNumber(metadata: Record<string, unknown>, key: string) {
  const v = metadata[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatSubtitle(entry: ServiceEntry, service: ServiceKey) {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  const parts: Array<string | null> = [];

  // Campo mais útil varia por serviço
  if (service === "gestao_midias") {
    const platform = getMetaString(metadata, "platform");
    const handle = getMetaString(metadata, "handle");
    const planType = getMetaString(metadata, "plan_type");
    const startedAt = getMetaString(metadata, "started_at");
    if (platform) parts.push(platform);
    if (handle) parts.push(handle);
    if (planType) parts.push(planType);
    if (startedAt) parts.push(`Início: ${startedAt}`);
  } else if (service === "carro_de_som") {
    const city = getMetaString(metadata, "city");
    const hours = getMetaNumber(metadata, "hours");
    const driver = getMetaString(metadata, "driver");
    if (city) parts.push(city);
    if (hours !== null) parts.push(`${hours}h`);
    if (driver) parts.push(`Motorista: ${driver}`);
  } else if (service === "revista_factus") {
    const edition = getMetaString(metadata, "edition");
    const page = getMetaString(metadata, "page");
    if (edition) parts.push(`Edição: ${edition}`);
    if (page) parts.push(`Página: ${page}`);
  } else if (service === "melhores_do_ano" || service === "premio_excelencia") {
    const awardType = getMetaString(metadata, "award_type");
    if (awardType) parts.push(awardType);
  } else {
    const client = getMetaString(metadata, "client");
    if (client) parts.push(client);
  }

  if (entry.entry_date) {
    try {
      parts.push(format(parseISO(entry.entry_date), "dd/MM/yy", { locale: ptBR }));
    } catch {
      parts.push(entry.entry_date);
    }
  }
  return parts.filter(Boolean).join(" • ");
}

export function ServiceEntriesSection(props: { service: ServiceKey; showMonthFilter?: boolean }) {
  const { user } = useAuth();
  const userId = user?.id;

  const { toast } = useToast();

  const { selectedMonth } = useMonthFilter();

  // Se o usuário deixar a data vazia, usamos um valor padrão do mês selecionado
  // para que o registro apareça na aba/mês atual.
  const defaultEntryDate = selectedMonth ? `${selectedMonth}-01` : null;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceEntry | null>(null);

  const entriesQuery = useServiceEntries(props.service, userId, selectedMonth);

  const upsert = useUpsertServiceEntry(props.service, userId ?? "");
  const del = useDeleteServiceEntry(props.service, userId ?? "");

  const totals = useMemo(() => {
    const entries = entriesQuery.data ?? [];
    const count = entries.length;
    const total = entries.reduce((acc, curr) => acc + (parseNumeric(curr.amount) ?? 0), 0);
    return { count, total };
  }, [entriesQuery.data]);

  const entries = entriesQuery.data ?? [];
  const config = SERVICE_ENTRY_CONFIG[props.service];

  return (
    <>
      {props.showMonthFilter === false ? null : <MonthFilter />}

      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard
          title="Total"
          value={formatBRL(totals.total)}
          icon={FileText}
          iconColor="bg-primary"
        />
        <IOSStatCard
          title="Registros"
          value={String(totals.count)}
          icon={FileText}
          iconColor="bg-secondary"
        />
      </div>

      <div className="flex items-center justify-between">
        <IOSSectionHeader title="Registros" />
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo
        </Button>
      </div>

      <IOSCardGroup>
        {entriesQuery.isLoading ? (
          <IOSListItem icon={<FileText className="w-4 h-4" />} iconBgColor="bg-secondary" title="Carregando..." />
        ) : entriesQuery.isError ? (
          <IOSListItem
            icon={<FileText className="w-4 h-4" />}
            iconBgColor="bg-ios-red"
            title="Erro ao carregar"
            subtitle={(entriesQuery.error as any)?.message ?? "Falha ao buscar dados"}
          />
        ) : entries.length === 0 ? (
          <IOSListItem
            icon={<FileText className="w-4 h-4" />}
            iconBgColor="bg-secondary"
            title="Nenhum registro ainda"
            subtitle="Toque em Novo para cadastrar"
          />
        ) : (
          entries.map((entry) => {
            const subtitle = formatSubtitle(entry, props.service);
            const amountNumber = parseNumeric(entry.amount);
            const payment = getPaymentInfo(entry);
            const receiptLabel = hasReceipt(entry) ? "Comprovante" : null;
            const paymentLabel = payment.isPaid
              ? "Pago"
              : payment.isPartial
                ? `Abatido: ${formatBRL(payment.paidAmount)} • Resta: ${formatBRL(payment.remaining)}`
                : payment.totalAbs > 0
                  ? `Em aberto • Resta: ${formatBRL(payment.remaining)}`
                  : "Em aberto";
            return (
              <IOSListItem
                key={entry.id}
                icon={<FileText className="w-4 h-4" />}
                iconBgColor={payment.isPaid ? "bg-ios-green" : "bg-ios-red"}
                title={entry.title}
                subtitle={[paymentLabel, receiptLabel, subtitle].filter(Boolean).join(" • ") || undefined}
                value={amountNumber === null ? undefined : formatBRL(amountNumber)}
                showChevron
                onClick={() => {
                  setEditing(entry);
                  setOpen(true);
                }}
              />
            );
          })
        )}
      </IOSCardGroup>

      <ServiceEntryDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditing(null);
        }}
        config={config}
        initial={editing}
        userId={userId ?? ""}
        defaultEntryDate={defaultEntryDate}
        startInView={Boolean(editing)}
        isSaving={upsert.isPending}
        isDeleting={del.isPending}
        onSubmit={async (payload) => {
          if (!userId) {
            toast({
              title: "Você precisa estar logado",
              description: "Sessão não encontrada. Recarregue a página e faça login novamente.",
              variant: "destructive",
            });
            return;
          }
          try {
            await upsert.mutateAsync(payload);
          } catch (e: any) {
            toast({
              title: "Não foi possível salvar",
              description:
                e?.message ?? e?.details ?? e?.hint ?? e?.code ?? "Falha ao salvar no banco",
              variant: "destructive",
            });
            throw e;
          }
        }}
        onDelete={
          editing?.id
            ? async (id) => {
                try {
                  await del.mutateAsync(id);
                  setOpen(false);
                  setEditing(null);
                } catch (e: any) {
                  toast({
                    title: "Não foi possível apagar",
                    description: e?.message ?? "Falha ao apagar",
                    variant: "destructive",
                  });
                  throw e;
                }
              }
            : undefined
        }
      />
    </>
  );
}
