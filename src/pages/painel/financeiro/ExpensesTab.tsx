import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { adminRepository } from "@/lib/repository/adminRepository"
import { useStaffSession } from "@/lib/auth/StaffSessionContext"
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL } from "@/lib/financeLabels"
import { PAYMENT_LABEL } from "@/lib/statusLabels"
import { formatPriceBRL } from "@/lib/utils"
import type { Expense, ExpenseCategory, PaymentMethod } from "@/lib/types"

const PAYMENT_METHODS: PaymentMethod[] = ["pix", "cartao", "dinheiro", "vale"]

function monthRange() {
  const now = new Date()
  const from = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd")
  const to = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd")
  return { from, to }
}

export function ExpensesTab() {
  const { session } = useStaffSession()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const [category, setCategory] = useState<ExpenseCategory>("aluguel")
  const [customLabel, setCustomLabel] = useState("")
  const [amount, setAmount] = useState("")
  const [payment, setPayment] = useState<PaymentMethod>("pix")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setExpenses(await adminRepository.listExpenses(monthRange()))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function submit() {
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100)
    if (!cents || cents <= 0) {
      toast.error("Informe um valor válido.")
      return
    }
    setBusy(true)
    try {
      await adminRepository.createExpense({
        category,
        customLabel: category === "outros" ? customLabel.trim() || null : null,
        amountCents: cents,
        paymentMethod: payment,
        notes: null,
        createdByBarberId: session!.barberId,
      })
      toast.success("Despesa registrada.")
      setAmount("")
      setCustomLabel("")
      setOpen(false)
      load()
    } catch {
      toast.error("Não foi possível registrar.")
    } finally {
      setBusy(false)
    }
  }

  const total = expenses.reduce((s, e) => s + e.amountCents, 0)

  return (
    <div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Despesas do mês
          </p>
          <p className="text-xl font-semibold text-foreground">{formatPriceBRL(total)}</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="size-4" />
          Nova
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
        ) : expenses.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Nenhuma despesa neste mês.
          </p>
        ) : (
          expenses.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {e.category === "outros" && e.customLabel
                    ? e.customLabel
                    : EXPENSE_CATEGORY_LABEL[e.category]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(e.occurredAt), "dd/MM")} · {PAYMENT_LABEL[e.paymentMethod]}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">
                  {formatPriceBRL(e.amountCents)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    adminRepository.deleteExpense(e.id).then(() => {
                      toast.success("Removida.")
                      load()
                    })
                  }
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova despesa</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Categoria</Label>
              <div className="grid grid-cols-2 gap-2">
                {EXPENSE_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={
                      "rounded-lg border px-2 py-2 text-xs font-medium transition-colors " +
                      (category === c
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50")
                    }
                  >
                    {EXPENSE_CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>

            {category === "outros" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="custom">Descrição</Label>
                <Input
                  id="custom"
                  placeholder="Descreva a despesa"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-amount">Valor</Label>
              <Input
                id="exp-amount"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Forma de pagamento</Label>
              <div className="grid grid-cols-4 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayment(m)}
                    className={
                      "h-9 rounded-lg border text-xs font-medium transition-colors " +
                      (payment === m
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50")
                    }
                  >
                    {PAYMENT_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>

            <Button disabled={busy} onClick={submit} className="mt-1 h-10">
              Registrar despesa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
