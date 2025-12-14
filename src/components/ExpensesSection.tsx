import { ExpenseDialog } from "@/components/ExpenseDialog";
import { IOSCardGroup, IOSListItem, IOSSectionHeader } from "@/components/IOSCard";
import { IOSStatCard } from "@/components/IOSStatCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { Expense } from "@/hooks/useExpenses";
import { useDeleteExpense, useExpenses, useUpsertExpense } from "@/hooks/useExpenses";
import { useMonthFilter } from "@/hooks/useMonthFilter";
import { formatBRL, parseNumeric, type ExpenseKind } from "@/lib/domain";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, TrendingDown, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

function kindColor(kind: ExpenseKind) {
  if (kind === "fixed") return "bg-ios-orange";
  if (kind === "variable") return "bg-ios-red";
  return "bg-ios-purple";
}

function getExpensePaymentInfo(expense: Expense) {
  const metadata = (expense.metadata ?? {}) as Record<string, unknown>;
  const total = parseNumeric(expense.amount) ?? 0;
  const paidAmountMeta = parseNumeric(metadata.paid_amount) ?? 0;
  const paidAmountEffective =
    total > 0
      ? expense.paid
        ? total
        : Math.min(Math.max(paidAmountMeta, 0), total)
      : 0;
  const remaining = total > 0 ? Math.max(0, total - paidAmountEffective) : 0;
  const isPaid = total > 0 ? remaining <= 0 : expense.paid;
  const isPartial = !isPaid && paidAmountEffective > 0 && remaining > 0;
  return { isPaid, isPartial, remaining, paidAmount: paidAmountEffective, total };
}

export function ExpensesSection() {
  const { user } = useAuth();
  const userId = user?.id;

  const { selectedMonth } = useMonthFilter();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const expensesQuery = useExpenses(userId, selectedMonth);
  const upsert = useUpsertExpense(userId ?? "");
  const del = useDeleteExpense(userId ?? "");

  const totals = useMemo(() => {
    const items = expensesQuery.data ?? [];
    const total = items.reduce((acc, curr) => acc + (parseNumeric(curr.amount) ?? 0), 0);
    const fixed = items
      .filter((e) => e.kind === "fixed")
      .reduce((acc, curr) => acc + (parseNumeric(curr.amount) ?? 0), 0);
    const variable = items
      .filter((e) => e.kind === "variable")
      .reduce((acc, curr) => acc + (parseNumeric(curr.amount) ?? 0), 0);
    const provision = items
      .filter((e) => e.kind === "provision")
      .reduce((acc, curr) => acc + (parseNumeric(curr.amount) ?? 0), 0);

    return { total, fixed, variable, provision, count: items.length };
  }, [expensesQuery.data]);

  const items = expensesQuery.data ?? [];

  const formatDate = (iso: string) => {
    try {
      return format(parseISO(iso), "dd/MM/yy", { locale: ptBR });
    } catch {
      return iso;
    }
  };

  const paymentMethodLabel = (method: string) => {
    const m = method.trim();
    if (m === "pix") return "Pix";
    if (m === "dinheiro") return "Dinheiro";
    if (m === "cartao") return "Cartão";
    if (m === "boleto") return "Boleto";
    if (m === "a_prazo") return "A prazo";
    if (m === "permuta") return "Permuta";
    if (m === "outro") return "Outro";
    return m;
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <IOSStatCard title="Total" value={formatBRL(totals.total)} icon={Wallet} iconColor="bg-ios-red" />
        <IOSStatCard title="Registros" value={String(totals.count)} icon={TrendingDown} iconColor="bg-secondary" />
      </div>

      <div className="flex items-center justify-between">
        <IOSSectionHeader title="Despesas" />
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
        {expensesQuery.isLoading ? (
          <IOSListItem icon={<Wallet className="w-4 h-4" />} iconBgColor="bg-secondary" title="Carregando..." />
        ) : items.length === 0 ? (
          <IOSListItem
            icon={<Wallet className="w-4 h-4" />}
            iconBgColor="bg-secondary"
            title="Nenhuma despesa cadastrada"
            subtitle="Toque em Nova para cadastrar"
          />
        ) : (
          items.map((expense) => (
            (() => {
              const payment = getExpensePaymentInfo(expense);
              const paymentLabel = payment.isPaid
                ? "Pago"
                : payment.isPartial
                  ? `Abatido: ${formatBRL(payment.paidAmount)} • Resta: ${formatBRL(payment.remaining)}`
                  : payment.total > 0
                    ? `Em aberto • Resta: ${formatBRL(payment.remaining)}`
                    : "Em aberto";

              return (
                <IOSListItem
                  key={expense.id}
                  icon={<Wallet className="w-4 h-4" />}
                  iconBgColor={payment.isPaid ? "bg-ios-green" : "bg-ios-red"}
                  title={expense.name}
                  subtitle={
                    [
                      paymentLabel,
                      expense.payment_method ? `Pagamento: ${paymentMethodLabel(expense.payment_method)}` : null,
                      expense.installments ? `${expense.installments}x` : null,
                      expense.cost_center ? `Centro: ${expense.cost_center}` : null,
                      expense.kind ? `Tipo: ${expense.kind}` : null,
                      expense.recurring ? "Recorrente" : null,
                      expense.receipt_url ? "Comprovante" : null,
                      expense.due_day ? `Venc.: dia ${expense.due_day}` : null,
                      formatDate(expense.expense_date),
                    ]
                      .filter(Boolean)
                      .join(" • ")
                  }
                  value={formatBRL(parseNumeric(expense.amount) ?? 0)}
                  showChevron
                  onClick={() => {
                    setEditing(expense);
                    setOpen(true);
                  }}
                />
              );
            })()
          ))
        )}
      </IOSCardGroup>

      {!expensesQuery.isLoading && (expensesQuery.data?.length ?? 0) === 0 ? null : null}

      <ExpenseDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditing(null);
        }}
        userId={userId ?? ""}
        initial={editing}
        isSaving={upsert.isPending}
        isDeleting={del.isPending}
        onSubmit={async (payload) => {
          if (!userId) return;
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
