import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Expense } from "@/hooks/useExpenses";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { EXPENSE_KIND_LABEL, formatBRL, parseNumeric, type ExpenseKind } from "@/lib/domain";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  kind: z.enum(["fixed", "variable", "provision"]),
  name: z.string().min(1, "Informe um nome"),
  amount: z
    .string()
    .min(1, "Informe um valor")
    .transform((v) => v.trim())
    .refine((v) => !Number.isNaN(Number(v.replace(/\./g, "").replace(",", "."))), { message: "Valor inválido" }),
  expense_date: z.string().min(1, "Informe uma data"),
  due_day: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 1 && Number(v) <= 31), {
      message: "Dia inválido (1-31)",
    }),
  paid: z.boolean().default(false),
  paid_amount: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v === "" || !Number.isNaN(Number(v.replace(/\./g, "").replace(",", "."))), {
      message: "Valor inválido",
    }),
  cost_center: z.string().optional(),
  payment_method: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine(
      (v) => v === "" || ["pix", "dinheiro", "cartao", "boleto", "a_prazo", "permuta", "outro"].includes(v),
      {
        message: "Forma de pagamento inválida",
      }
    ),
  installments: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 1 && Number(v) <= 360), {
      message: "Parcelas inválidas",
    }),
  recurring: z.boolean().default(false),
  recurring_rule: z.string().optional(),
  receipt_url: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toMoneyInputString(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(2).replace(".", ",");
  }
  if (typeof value === "string") return value;
  return "";
}

function clampMoney(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function ExpenseDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  startInView?: boolean;
  initial?: Expense | null;
  onSubmit: (payload: {
    id?: string;
    kind: ExpenseKind;
    name: string;
    amount: number;
    expense_date: string;
    due_day: number | null;
    paid: boolean;
    cost_center: string | null;
    payment_method: string | null;
    installments: number | null;
    recurring: boolean;
    recurring_rule: string | null;
    receipt_url: string | null;
    notes: string | null;
    metadata: Json;
  }) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  isSaving?: boolean;
  isDeleting?: boolean;
}) {
  const { open, onOpenChange, initial } = props;
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("edit");

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

  const effectiveId = useMemo(() => {
    return initial?.id ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined);
  }, [initial?.id]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: "variable",
      name: "",
      amount: "",
      expense_date: new Date().toISOString().slice(0, 10),
      due_day: "",
      paid: false,
      paid_amount: "",
      cost_center: "",
      payment_method: "",
      installments: "",
      recurring: false,
      recurring_rule: "",
      receipt_url: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    setReceiptFile(null);

    setMode(initial?.id && props.startInView ? "view" : "edit");

    const metadata = (initial?.metadata ?? {}) as Record<string, unknown>;
    const total = parseNumeric(initial?.amount) ?? 0;
    const metaPaidAmount = parseNumeric(metadata.paid_amount);
    const paidAmountForForm = metaPaidAmount !== null
      ? metaPaidAmount
      : initial?.paid && total > 0
        ? total
        : null;

    form.reset({
      kind: (initial?.kind as ExpenseKind) ?? "variable",
      name: initial?.name ?? "",
      amount: toMoneyInputString(initial?.amount),
      expense_date: initial?.expense_date ?? new Date().toISOString().slice(0, 10),
      due_day: initial?.due_day ? String(initial.due_day) : "",
      paid: initial?.paid ?? false,
      paid_amount: paidAmountForForm === null ? "" : toMoneyInputString(paidAmountForForm),
      cost_center: initial?.cost_center ?? "",
      payment_method: initial?.payment_method ?? "",
      installments: initial?.installments ? String(initial.installments) : "",
      recurring: initial?.recurring ?? false,
      recurring_rule: initial?.recurring_rule ?? "",
      receipt_url: initial?.receipt_url ?? "",
      notes: initial?.notes ?? "",
    });
  }, [open, initial, form]);

  const viewData = useMemo(() => {
    if (!initial) return null;
    const metadata = (initial.metadata ?? {}) as Record<string, unknown>;
    const total = parseNumeric(initial.amount) ?? 0;
    const paidAmountMeta = parseNumeric(metadata.paid_amount) ?? 0;
    const paidAmountEffective =
      total > 0
        ? initial.paid
          ? total
          : Math.min(Math.max(paidAmountMeta, 0), total)
        : 0;
    const remaining = total > 0 ? Math.max(0, total - paidAmountEffective) : 0;
    const isPaid = total > 0 ? remaining <= 0 : initial.paid;
    const isPartial = !isPaid && paidAmountEffective > 0 && remaining > 0;

    const kindLabel = initial.kind ? EXPENSE_KIND_LABEL[initial.kind as ExpenseKind] ?? initial.kind : "";

    return {
      kindLabel,
      total,
      paidAmountEffective,
      remaining,
      isPaid,
      isPartial,
      receiptPath: initial.receipt_url ? String(initial.receipt_url) : "",
    };
  }, [initial]);

  const handleSubmit = async (values: FormValues) => {
    const amountNumber = Number(values.amount.replace(/\./g, "").replace(",", "."));
    const paidAmountNumber = values.paid_amount
      ? Number(values.paid_amount.replace(/\./g, "").replace(",", "."))
      : null;

    const paidAmountEffective =
      amountNumber <= 0
        ? null
        : values.paid
          ? amountNumber
          : paidAmountNumber === null || !Number.isFinite(paidAmountNumber)
            ? 0
            : clampMoney(paidAmountNumber, 0, amountNumber);
    const remaining =
      paidAmountEffective === null ? null : Math.max(0, amountNumber - paidAmountEffective);
    const paidEffective = amountNumber <= 0 ? values.paid : remaining !== null ? remaining <= 0 : values.paid;

    let receiptPath: string | null = values.receipt_url ? String(values.receipt_url) : null;

    if (receiptFile) {
      if (!props.userId) return;
      if (!effectiveId) return;

      const safeName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const objectPath = `${props.userId}/expenses/${effectiveId}/${Date.now()}_${safeName}`;

      setIsUploadingReceipt(true);
      try {
        const { error } = await supabase.storage
          .from("expense_receipts")
          .upload(objectPath, receiptFile, { upsert: true, contentType: receiptFile.type });
        if (error) throw error;
        receiptPath = objectPath;
      } finally {
        setIsUploadingReceipt(false);
      }
    }

    await props.onSubmit({
      id: effectiveId,
      kind: values.kind,
      name: values.name,
      amount: amountNumber,
      expense_date: values.expense_date,
      due_day: values.due_day ? Number(values.due_day) : null,
      paid: paidEffective,
      cost_center: values.cost_center ? values.cost_center : null,
      payment_method: values.payment_method ? values.payment_method : null,
      installments: values.installments ? Number(values.installments) : null,
      recurring: values.recurring,
      recurring_rule: values.recurring_rule ? values.recurring_rule : null,
      receipt_url: receiptPath,
      notes: values.notes ? values.notes : null,
      metadata: {
        ...(typeof initial?.metadata === "object" && initial?.metadata ? (initial.metadata as Record<string, unknown>) : {}),
        paid_amount:
          paidAmountEffective !== null && Number.isFinite(paidAmountEffective) && paidAmountEffective > 0
            ? paidAmountEffective
            : undefined,
      } as Json,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-24px)] max-w-lg p-4 gap-3 top-[calc(env(safe-area-inset-top)+12px)] translate-y-0 max-h-[calc(100dvh-24px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-hidden"
      >
        <DialogHeader>
          <DialogTitle>
            {initial
              ? mode === "view"
                ? "Detalhes da despesa"
                : "Editar despesa"
              : "Nova despesa"}
          </DialogTitle>
        </DialogHeader>

        {mode === "view" && initial ? (
          <>
            <div className="space-y-3 overflow-y-auto pr-1">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <p className="text-sm">{viewData?.kindLabel || "-"}</p>
              </div>

              <div className="space-y-1">
                <Label>Nome</Label>
                <p className="text-sm">{initial.name || "-"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Valor</Label>
                  <p className="text-sm">{formatBRL(viewData?.total ?? 0)}</p>
                </div>
                <div className="space-y-1">
                  <Label>Data</Label>
                  <p className="text-sm">{initial.expense_date || "-"}</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Status</Label>
                <p className="text-sm">
                  {viewData?.isPaid
                    ? "Pago"
                    : viewData?.isPartial
                      ? `Abatido: ${formatBRL(viewData.paidAmountEffective)} • Resta: ${formatBRL(viewData.remaining)}`
                      : viewData && viewData.total > 0
                        ? `Em aberto • Resta: ${formatBRL(viewData.remaining)}`
                        : "Em aberto"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Vencimento</Label>
                  <p className="text-sm">{initial.due_day ? `Dia ${initial.due_day}` : "-"}</p>
                </div>
                <div className="space-y-1">
                  <Label>Centro de custo</Label>
                  <p className="text-sm">{initial.cost_center || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Pagamento</Label>
                  <p className="text-sm">
                    {initial.payment_method ? paymentMethodLabel(initial.payment_method) : "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Parcelas</Label>
                  <p className="text-sm">{initial.installments ? `${initial.installments}x` : "-"}</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Recorrente</Label>
                <p className="text-sm">{initial.recurring ? initial.recurring_rule || "Sim" : "Não"}</p>
              </div>

              <div className="space-y-1">
                <Label>Comprovante</Label>
                {viewData?.receiptPath ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const path = viewData.receiptPath;
                      if (!path) return;
                      const { data, error } = await supabase.storage
                        .from("expense_receipts")
                        .createSignedUrl(path, 60);
                      if (error) return;
                      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Abrir
                  </Button>
                ) : (
                  <p className="text-sm">-</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Observações</Label>
                <p className="text-sm whitespace-pre-wrap">{initial.notes || "-"}</p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" onClick={() => setMode("edit")}>
                Editar
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form className="space-y-3" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={form.watch("kind")}
              onValueChange={(v) => form.setValue("kind", v as FormValues["kind"], { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixa</SelectItem>
                <SelectItem value="variable">Variável</SelectItem>
                <SelectItem value="provision">Provisão</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input id="amount" inputMode="decimal" placeholder="0,00" {...form.register("amount")} />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense_date">Data</Label>
              <Input id="expense_date" type="date" {...form.register("expense_date")} />
              {form.formState.errors.expense_date && (
                <p className="text-sm text-destructive">{form.formState.errors.expense_date.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>Forma de pagamento (opcional)</Label>
              <Select
                value={form.watch("payment_method") || ""}
                onValueChange={(v) => form.setValue("payment_method", v as FormValues["payment_method"], { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="a_prazo">A prazo</SelectItem>
                  <SelectItem value="permuta">Permuta</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.payment_method && (
                <p className="text-sm text-destructive">{form.formState.errors.payment_method.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="installments">Parcelas (opcional)</Label>
              <Input id="installments" inputMode="numeric" placeholder="Ex: 3" {...form.register("installments")} />
              {form.formState.errors.installments && (
                <p className="text-sm text-destructive">{form.formState.errors.installments.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="cost_center">Centro de custo (opcional)</Label>
              <Input id="cost_center" placeholder="Ex: Operacional" {...form.register("cost_center")} />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Recorrente</p>
                <p className="text-xs text-muted-foreground">Marque se repete</p>
              </div>
              <Switch checked={form.watch("recurring")} onCheckedChange={(v) => form.setValue("recurring", v)} />
            </div>
          </div>

          {form.watch("recurring") && (
            <div className="space-y-2">
              <Label htmlFor="recurring_rule">Regra/intervalo (opcional)</Label>
              <Input id="recurring_rule" placeholder="Ex: mensal, semanal, todo dia 10" {...form.register("recurring_rule")} />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="receipt_file">Comprovante (upload, opcional)</Label>
            <Input
              id="receipt_file"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
            {receiptFile ? (
              <p className="text-xs text-muted-foreground">Selecionado: {receiptFile.name}</p>
            ) : form.watch("receipt_url") ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Comprovante anexado</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const path = form.watch("receipt_url");
                    if (!path) return;
                    const { data, error } = await supabase.storage
                      .from("expense_receipts")
                      .createSignedUrl(path, 60);
                    if (error) return;
                    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                  }}
                >
                  Abrir
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => form.setValue("receipt_url", "")}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Aceita imagem ou PDF</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="due_day">Vencimento (dia, opcional)</Label>
              <Input id="due_day" inputMode="numeric" placeholder="1-31" {...form.register("due_day")} />
              {form.formState.errors.due_day && (
                <p className="text-sm text-destructive">{form.formState.errors.due_day.message}</p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Pago</p>
                <p className="text-xs text-muted-foreground">Marque quando quitar</p>
              </div>
              <Switch
                checked={form.watch("paid")}
                onCheckedChange={(v) => {
                  form.setValue("paid", v);
                  if (v) {
                    const total = parseNumeric(form.getValues("amount")) ?? 0;
                    if (total > 0) form.setValue("paid_amount", toMoneyInputString(total));
                  } else {
                    // Se desmarcar como pago, volta para "em aberto".
                    form.setValue("paid_amount", "");
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paid_amount">Abater (R$) (opcional)</Label>
            <Input id="paid_amount" inputMode="decimal" placeholder="0,00" {...form.register("paid_amount")} />
            {(() => {
              const total = parseNumeric(form.watch("amount")) ?? 0;
              const paidAbs = parseNumeric(form.watch("paid_amount")) ?? 0;
              const paid = form.watch("paid");
              if (!total || total <= 0) return null;
              const effectivePaid = paid ? total : clampMoney(paidAbs, 0, total);
              const remaining = Math.max(0, total - effectivePaid);
              return remaining > 0 ? (
                <p className="text-xs text-muted-foreground">Resta: {formatBRL(remaining)}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Quitado</p>
              );
            })()}
            {form.formState.errors.paid_amount && (
              <p className="text-sm text-destructive">{form.formState.errors.paid_amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea id="notes" rows={2} {...form.register("notes")} />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {initial?.id && props.onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => props.onDelete?.(initial.id)}
                disabled={props.isDeleting || props.isSaving}
              >
                Excluir
              </Button>
            )}
            <Button type="submit" disabled={props.isSaving || props.isDeleting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
