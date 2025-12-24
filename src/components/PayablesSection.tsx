import { IOSCardGroup, IOSListItem, IOSSectionHeader } from "@/components/IOSCard";
import { IOSStatCard } from "@/components/IOSStatCard";
import { MonthFilter } from "@/components/MonthFilter";
import { PayableDialog } from "@/components/PayableDialog";
import { Button } from "@/components/ui/button";
import { useMonthFilter } from "@/hooks/useMonthFilter";
import type { Payable } from "@/hooks/usePayables";
import { useDeletePayable, usePayables, useUpsertPayable } from "@/hooks/usePayables";
import { formatBRL, parseNumeric } from "@/lib/domain";
import { FileText, Plus } from "lucide-react";
import { useMemo, useState } from "react";

function isOverdue(dueDate: string) {
  const today = new Date();
  const d = new Date(`${dueDate}T00:00:00`);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return d < t0;
}

export function PayablesSection(props: { showMonthFilter?: boolean } = {}) {
  const { selectedMonth } = useMonthFilter();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payable | null>(null);

  const payablesQuery = usePayables(selectedMonth);
  const upsert = useUpsertPayable();
  const del = useDeletePayable();

  const totals = useMemo(() => {
    const items = payablesQuery.data ?? [];
    const count = items.length;
    const openCount = items.filter((p) => p.status === "open").length;
    const totalOpen = items
      .filter((p) => p.status === "open")
      .reduce((acc, curr) => acc + (parseNumeric(curr.amount) ?? 0), 0);
    return { count, openCount, totalOpen };
  }, [payablesQuery.data]);

  const items = payablesQuery.data ?? [];

  const statusLabel = (s: string) => {
    if (s === "paid") return "Pago";
    if (s === "canceled") return "Cancelado";
    return "Em aberto";
  };

  return (
    <>
      {props.showMonthFilter === false ? null : <MonthFilter />}

      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard title="Em aberto" value={formatBRL(totals.totalOpen)} icon={FileText} iconColor="bg-ios-red" />
        <IOSStatCard title="Registros" value={String(totals.count)} icon={FileText} iconColor="bg-secondary" />
      </div>

      <div className="flex items-center justify-between">
        <IOSSectionHeader title="Contas a pagar" />
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova
        </Button>
      </div>

      <IOSCardGroup>
        {payablesQuery.isLoading ? (
          <IOSListItem icon={<FileText className="w-4 h-4" />} iconBgColor="bg-secondary" title="Carregando..." />
        ) : items.length === 0 ? (
          <IOSListItem
            icon={<FileText className="w-4 h-4" />}
            iconBgColor="bg-secondary"
            title="Nenhuma conta cadastrada"
            subtitle="Toque em Nova para cadastrar"
          />
        ) : (
          items.map((p) => {
            const amount = parseNumeric(p.amount) ?? 0;
            const overdue = p.status === "open" && isOverdue(p.due_date);
            const subtitle = [
              statusLabel(p.status),
              p.due_date ? `Venc.: ${p.due_date}${overdue ? " (atrasado)" : ""}` : null,
              p.description ? p.description : null,
            ]
              .filter(Boolean)
              .join(" • ");

            return (
              <IOSListItem
                key={p.id}
                icon={<FileText className="w-4 h-4" />}
                iconBgColor={p.status === "paid" ? "bg-ios-green" : overdue ? "bg-ios-red" : "bg-ios-orange"}
                title={p.vendor}
                subtitle={subtitle}
                value={formatBRL(amount)}
                showChevron
                onClick={() => {
                  setEditing(p);
                  setOpen(true);
                }}
              />
            );
          })
        )}
      </IOSCardGroup>

      <PayableDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditing(null);
        }}
        initial={editing}
        startInView={Boolean(editing)}
        isSaving={upsert.isPending}
        isDeleting={del.isPending}
        onSubmit={async (payload) => {
          await upsert.mutateAsync(payload);
        }}
        onDelete={
          editing?.id
            ? async (id) => {
                await del.mutateAsync(id);
                setOpen(false);
                setEditing(null);
              }
            : undefined
        }
      />
    </>
  );
}
