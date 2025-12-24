import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Payable } from "@/hooks/usePayables";
import { formatBRL, parseNumeric } from "@/lib/domain";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  vendor: z.string().min(1, "Informe o fornecedor"),
  description: z.string().optional(),
  amount: z
    .string()
    .min(1, "Informe um valor")
    .transform((v) => v.trim())
    .refine((v) => !Number.isNaN(Number(v.replace(/\./g, "").replace(",", "."))), { message: "Valor inválido" }),
  due_date: z.string().min(1, "Informe o vencimento"),
  status: z.enum(["open", "paid", "canceled"]).default("open"),
  payment_method: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine(
      (v) => v === "" || ["pix", "dinheiro", "cartao", "boleto", "a_prazo", "permuta", "outro"].includes(v),
      { message: "Forma de pagamento inválida" }
    ),
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

export function PayableDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Payable | null;
  startInView?: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  onSubmit: (payload: {
    id?: string;
    vendor: string;
    description: string | null;
    amount: number;
    due_date: string;
    status: "open" | "paid" | "canceled";
    payment_method: string | null;
    notes: string | null;
  }) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}) {
  const { open, onOpenChange, initial } = props;
  const [mode, setMode] = useState<"view" | "edit">("edit");

  const effectiveId = useMemo(() => {
    return initial?.id ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined);
  }, [initial?.id]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendor: "",
      description: "",
      amount: "",
      due_date: new Date().toISOString().slice(0, 10),
      status: "open",
      payment_method: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    setMode(initial?.id && props.startInView ? "view" : "edit");

    form.reset({
      vendor: initial?.vendor ?? "",
      description: initial?.description ?? "",
      amount: toMoneyInputString(initial?.amount),
      due_date: initial?.due_date ?? new Date().toISOString().slice(0, 10),
      status: (initial?.status as FormValues["status"]) ?? "open",
      payment_method: initial?.payment_method ?? "",
      notes: initial?.notes ?? "",
    });
  }, [open, initial, form, props.startInView]);

  const handleSubmit = async (values: FormValues) => {
    const amountNumber = Number(values.amount.replace(/\./g, "").replace(",", "."));
    const status = values.status;

    await props.onSubmit({
      id: effectiveId,
      vendor: values.vendor,
      description: values.description?.trim() ? values.description.trim() : null,
      amount: amountNumber,
      due_date: values.due_date,
      status,
      payment_method: values.payment_method ? values.payment_method : null,
      notes: values.notes?.trim() ? values.notes.trim() : null,
    });

    onOpenChange(false);
  };

  const statusLabel = (s: string) => {
    if (s === "paid") return "Pago";
    if (s === "canceled") return "Cancelado";
    return "Em aberto";
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

  const isPaidSwitch = form.watch("status") === "paid";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-lg p-4 gap-3 top-[calc(env(safe-area-inset-top)+12px)] translate-y-0 max-h-[calc(100dvh-24px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {initial
              ? mode === "view"
                ? "Detalhes da conta"
                : "Editar conta"
              : "Nova conta"}
          </DialogTitle>
        </DialogHeader>

        {mode === "view" && initial ? (
          <>
            <div className="space-y-3 overflow-y-auto pr-1">
              <div className="space-y-1">
                <Label>Fornecedor</Label>
                <p className="text-sm">{initial.vendor}</p>
              </div>

              <div className="space-y-1">
                <Label>Descrição</Label>
                <p className="text-sm whitespace-pre-wrap">{initial.description || "-"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Valor</Label>
                  <p className="text-sm">{formatBRL(parseNumeric(initial.amount) ?? 0)}</p>
                </div>
                <div className="space-y-1">
                  <Label>Vencimento</Label>
                  <p className="text-sm">{initial.due_date}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <p className="text-sm">{statusLabel(initial.status)}</p>
                </div>
                <div className="space-y-1">
                  <Label>Pagamento</Label>
                  <p className="text-sm">{initial.payment_method ? paymentMethodLabel(initial.payment_method) : "-"}</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Observações</Label>
                <p className="text-sm whitespace-pre-wrap">{initial.notes || "-"}</p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" onClick={() => setMode("edit")}>Editar</Button>
            </DialogFooter>
          </>
        ) : (
          <form className="space-y-3" onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="vendor">Fornecedor</Label>
              <Input id="vendor" placeholder="Ex: Energisa" {...form.register("vendor")} />
              {form.formState.errors.vendor && (
                <p className="text-sm text-destructive">{form.formState.errors.vendor.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input id="description" placeholder="Ex: Luz do escritório" {...form.register("description")} />
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
                <Label htmlFor="due_date">Vencimento</Label>
                <Input id="due_date" type="date" {...form.register("due_date")} />
                {form.formState.errors.due_date && (
                  <p className="text-sm text-destructive">{form.formState.errors.due_date.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(v) => form.setValue("status", v as FormValues["status"], { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Em aberto</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="canceled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Pago</p>
                  <p className="text-xs text-muted-foreground">Marque quando quitar</p>
                </div>
                <Switch
                  checked={isPaidSwitch}
                  onCheckedChange={(v) => form.setValue("status", v ? "paid" : "open", { shouldValidate: true })}
                />
              </div>
            </div>

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
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea id="notes" rows={3} {...form.register("notes")} />
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
