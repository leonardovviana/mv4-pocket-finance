import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceEntry } from "@/hooks/useServiceEntries";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { formatBRL, parseNumeric } from "@/lib/domain";
import type { ServiceEntryConfig } from "@/lib/serviceEntryConfig";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1, "Informe um título"),
  entry_type: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v === "" || v === "receita" || v === "despesa", { message: "Tipo inválido" }),
  amount: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v === "" || !Number.isNaN(Number(v.replace(/\./g, "").replace(",", "."))), {
      message: "Valor inválido",
    }),
  entry_date: z.string().optional(),
  status: z.string().optional(),
  paid: z.boolean().default(false),
  paid_amount: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v === "" || !Number.isNaN(Number(v.replace(/\./g, "").replace(",", "."))), {
      message: "Valor inválido",
    }),
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
  receipt_path: z.string().optional(),

  plan_type: z.string().optional(),
  platform: z.string().optional(),
  handle: z.string().optional(),
  started_at: z.string().optional(),
  city: z.string().optional(),
  hours: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .refine((v) => v === "" || !Number.isNaN(Number(v)), { message: "Número inválido" }),
  route: z.string().optional(),
  audio_script: z.string().optional(),
  driver: z.string().optional(),
  edition: z.string().optional(),
  page: z.string().optional(),
  award_type: z.string().optional(),

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

export function ServiceEntryDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  config: ServiceEntryConfig;
  initial?: ServiceEntry | null;
  userId: string;
  onSubmit: (payload: {
    id?: string;
    title: string;
    amount: number | null;
    entry_date: string | null;
    status: string | null;
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

  const effectiveId = useMemo(() => {
    return initial?.id ?? (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined);
  }, [initial?.id]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      entry_type: "receita",
      amount: "",
      entry_date: "",
      status: "",
      paid: false,
      paid_amount: "",
      payment_method: "",
      installments: "",
      receipt_path: "",
      plan_type: "",
      platform: "",
      handle: "",
      started_at: "",
      city: "",
      hours: "",
      route: "",
      audio_script: "",
      driver: "",
      edition: "",
      page: "",
      award_type: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    setReceiptFile(null);

    const metadata = (initial?.metadata ?? {}) as Record<string, unknown>;
    const metaEntryType = typeof metadata.entry_type === "string" ? metadata.entry_type : "";
    const parsedInitialAmount = parseNumeric(initial?.amount);
    const inferredType = metaEntryType === "receita" || metaEntryType === "despesa"
      ? metaEntryType
      : parsedInitialAmount !== null && Number.isFinite(parsedInitialAmount) && parsedInitialAmount < 0
        ? "despesa"
        : "receita";

    const paid = typeof metadata.paid === "boolean" ? metadata.paid : false;
    const payment_method = typeof metadata.payment_method === "string" ? metadata.payment_method : "";
    const installments =
      typeof metadata.installments === "number" && Number.isFinite(metadata.installments)
        ? String(metadata.installments)
        : typeof metadata.installments === "string"
          ? metadata.installments
          : "";

    const getString = (k: string) => (typeof metadata[k] === "string" ? (metadata[k] as string) : "");
    const getBool = (k: string) => (typeof metadata[k] === "boolean" ? (metadata[k] as boolean) : false);
    const hours =
      typeof metadata.hours === "number" && Number.isFinite(metadata.hours)
        ? String(metadata.hours)
        : typeof metadata.hours === "string"
          ? metadata.hours
          : "";

    const totalAbs = Math.abs(parseNumeric(initial?.amount) ?? 0);
    const metaPaidAmount = parseNumeric(metadata.paid_amount);
    const paidAmountForForm = metaPaidAmount !== null
      ? metaPaidAmount
      : paid && totalAbs > 0
        ? totalAbs
        : null;

    const receiptPath = typeof metadata.receipt_path === "string" ? metadata.receipt_path : "";

    form.reset({
      title: initial?.title ?? "",
      entry_type: inferredType,
      amount: toMoneyInputString(initial?.amount),
      entry_date: initial?.entry_date ?? "",
      status: initial?.status ?? "",
      paid,
      paid_amount: paidAmountForForm === null ? "" : toMoneyInputString(paidAmountForForm),
      payment_method,
      installments,

      receipt_path: receiptPath,

      plan_type: getString("plan_type"),
      platform: getString("platform"),
      handle: getString("handle"),
      started_at: getString("started_at"),
      city: getString("city"),
      hours,
      route: getString("route"),
      audio_script: getString("audio_script"),
      driver: getString("driver"),
      edition: getString("edition"),
      page: getString("page"),
      award_type: getString("award_type"),

      notes: initial?.notes ?? "",
    });
  }, [open, initial, form]);

  const handleSubmit = async (values: FormValues) => {
    const parsedAmount = values.amount
      ? Number(values.amount.replace(/\./g, "").replace(",", "."))
      : null;

    const parsedPaidAmount = values.paid_amount
      ? Number(values.paid_amount.replace(/\./g, "").replace(",", "."))
      : null;

    const entryType = values.entry_type === "despesa" ? "despesa" : "receita";
    const amountNumber =
      parsedAmount === null || !Number.isFinite(parsedAmount)
        ? null
        : entryType === "despesa"
          ? -Math.abs(parsedAmount)
          : Math.abs(parsedAmount);

    const totalAbs = amountNumber === null ? null : Math.abs(amountNumber);
    const paidAmountEffective =
      totalAbs === null || totalAbs <= 0
        ? null
        : values.paid
          ? totalAbs
          : parsedPaidAmount === null || !Number.isFinite(parsedPaidAmount)
            ? 0
            : clampMoney(parsedPaidAmount, 0, totalAbs);
    const remaining =
      totalAbs === null || paidAmountEffective === null
        ? null
        : Math.max(0, totalAbs - paidAmountEffective);
    const paidEffective =
      totalAbs === null || totalAbs <= 0
        ? values.paid
        : remaining !== null
          ? remaining <= 0
          : values.paid;

    const hoursNumber = values.hours ? Number(values.hours) : null;
    const installmentsNumber = values.installments ? Number(values.installments) : null;

    const baseMeta =
      typeof initial?.metadata === "object" && initial?.metadata ? (initial.metadata as Record<string, unknown>) : {};

    const extraKeys: Array<keyof FormValues> = props.config.extraFields.map((f) => f.key as keyof FormValues);
    const nextMeta: Record<string, unknown> = {
      ...baseMeta,
      entry_type: entryType,
      paid: paidEffective,
      paid_amount:
        paidAmountEffective !== null && Number.isFinite(paidAmountEffective) && paidAmountEffective > 0
          ? paidAmountEffective
          : undefined,
      payment_method: values.payment_method ? values.payment_method : undefined,
      installments: installmentsNumber !== null && Number.isFinite(installmentsNumber) ? installmentsNumber : undefined,
    };

    let receiptPath: string | null = values.receipt_path ? String(values.receipt_path) : null;

    if (receiptFile) {
      if (!props.userId) return;
      if (!effectiveId) return;

      const safeName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const objectPath = `${props.userId}/service_entries/${effectiveId}/${Date.now()}_${safeName}`;

      setIsUploadingReceipt(true);
      try {
        const { error } = await supabase.storage
          .from("service_entry_receipts")
          .upload(objectPath, receiptFile, { upsert: true, contentType: receiptFile.type });
        if (error) throw error;
        receiptPath = objectPath;
      } finally {
        setIsUploadingReceipt(false);
      }
    }

    if (receiptPath) {
      nextMeta.receipt_path = receiptPath;
    } else {
      nextMeta.receipt_path = undefined;
    }

    const nextStatusRaw = values.status ? values.status.trim() : "";
    const nextStatus = nextStatusRaw ? nextStatusRaw : paidEffective ? "pago" : initial?.status ?? null;

    for (const key of extraKeys) {
      const v = values[key];
      if (typeof v === "string") {
        nextMeta[String(key)] = v.trim() ? v.trim() : undefined;
      } else if (typeof v === "boolean") {
        nextMeta[String(key)] = v;
      }
    }

    if (extraKeys.includes("hours") && hoursNumber !== null && Number.isFinite(hoursNumber)) {
      nextMeta.hours = hoursNumber;
    }

    await props.onSubmit({
      id: effectiveId,
      title: values.title,
      amount: amountNumber,
      entry_date: values.entry_date ? values.entry_date : null,
      status: nextStatus,
      notes: values.notes ? values.notes : null,
      metadata: {
        ...nextMeta,
      } as Json,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="title">{props.config.titleLabel}</Label>
            <Input id="title" placeholder={props.config.titlePlaceholder} {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.watch("entry_type") || "receita"}
                onValueChange={(v) => form.setValue("entry_type", v as FormValues["entry_type"], { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.entry_type && (
                <p className="text-sm text-destructive">{form.formState.errors.entry_type.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">{props.config.amountLabel ?? "Valor (opcional)"}</Label>
              <Input id="amount" inputMode="decimal" placeholder="0,00" {...form.register("amount")} />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry_date">{props.config.entryDateLabel ?? "Data (opcional)"}</Label>
            <Input id="entry_date" type="date" {...form.register("entry_date")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Pago</p>
                <p className="text-xs text-muted-foreground">Marque quando receber</p>
              </div>
              <Switch
                checked={form.watch("paid")}
                onCheckedChange={(v) => {
                  form.setValue("paid", v);
                  if (v) {
                    const totalAbs = Math.abs(parseNumeric(form.getValues("amount")) ?? 0);
                    if (totalAbs > 0) form.setValue("paid_amount", toMoneyInputString(totalAbs));
                  } else {
                    // Se desmarcar como pago, volta para "em aberto".
                    form.setValue("paid_amount", "");
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Forma de pagamento (opcional)</Label>
              <Select
                value={form.watch("payment_method") || ""}
                onValueChange={(v) =>
                  form.setValue("payment_method", v as FormValues["payment_method"], { shouldValidate: true })
                }
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="paid_amount">Abater (R$) (opcional)</Label>
            <Input id="paid_amount" inputMode="decimal" placeholder="0,00" {...form.register("paid_amount")} />
            {(() => {
              const amountAbs = Math.abs(parseNumeric(form.watch("amount")) ?? 0);
              const paidAbs = parseNumeric(form.watch("paid_amount")) ?? 0;
              const paid = form.watch("paid");
              if (!amountAbs || amountAbs <= 0) return null;
              const effectivePaid = paid ? amountAbs : clampMoney(paidAbs, 0, amountAbs);
              const remaining = Math.max(0, amountAbs - effectivePaid);
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
            <Label htmlFor="installments">Parcelas (opcional)</Label>
            <Input id="installments" inputMode="numeric" placeholder="Ex: 3" {...form.register("installments")} />
            {form.formState.errors.installments && (
              <p className="text-sm text-destructive">{form.formState.errors.installments.message}</p>
            )}
          </div>

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
            ) : form.watch("receipt_path") ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Comprovante anexado</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const path = form.watch("receipt_path");
                    if (!path) return;
                    const { data, error } = await supabase.storage
                      .from("service_entry_receipts")
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
                  onClick={() => form.setValue("receipt_path", "")}
                >
                  Remover
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Aceita imagem ou PDF</p>
            )}
          </div>

          {props.config.extraFields.map((f) => {
            if (f.type === "date") {
              return (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input id={f.key} type="date" {...form.register(f.key as never)} />
                </div>
              );
            }

            if (f.type === "number") {
              return (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input id={f.key} inputMode="numeric" {...form.register(f.key as never)} />
                </div>
              );
            }

            return (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input id={f.key} {...form.register(f.key as never)} />
              </div>
            );
          })}

          <div className="space-y-2">
            <Label htmlFor="status">Status (opcional)</Label>
            <Input id="status" {...form.register("status")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea id="notes" rows={4} {...form.register("notes")} />
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
            <Button type="submit" disabled={props.isSaving || props.isDeleting || isUploadingReceipt}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
