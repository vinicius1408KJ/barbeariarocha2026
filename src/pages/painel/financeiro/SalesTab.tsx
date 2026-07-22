import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { Plus } from "lucide-react"
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
import { CARD_TYPE_LABEL, SALE_TYPE_LABEL } from "@/lib/financeLabels"
import { PAYMENT_LABEL } from "@/lib/statusLabels"
import { formatPriceBRL } from "@/lib/utils"
import type { PaymentMethod, SaleType, Transaction } from "@/lib/types"

const PAYMENT_METHODS: PaymentMethod[] = ["pix", "cartao", "dinheiro", "vale"]
// Only manual sale types here — service sales come from appointment completion.
const MANUAL_TYPES: SaleType[] = ["produto", "assinatura"]

function monthRange() {
  const now = new Date()
  const from = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd")
  const to = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd")
  return { from, to }
}

export function SalesTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saleType, setSaleType] = useState<SaleType>("produto")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [payment, setPayment] = useState<PaymentMethod>("pix")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setTransactions(await adminRepository.listTransactions(monthRange()))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function submit() {
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100)
    if (!description.trim()) {
      toast.error("Informe a descrição.")
      return
    }
    if (!cents || cents <= 0) {
      toast.error("Informe um valor válido.")
      return
    }
    setBusy(true)
    try {
      await adminRepository.createTransaction({
        saleType,
        barberId: null,
        description: description.trim(),
        amountCents: cents,
        paymentMethod: payment,
        notes: null,
      })
      toast.success("Venda registrada.")
      setDescription("")
      setAmount("")
      setOpen(false)
      load()
    } catch {
      toast.error("Não foi possível registrar.")
    } finally {
      setBusy(false)
    }
  }

  const total = transactions.reduce((s, t) => s + t.amountCents, 0)

  return (
    <div>
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Receita do mês
          </p>
          <p className="text-xl font-semibold text-primary">{formatPriceBRL(total)}</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="size-4" />
          Venda
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
        ) : transactions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Nenhuma venda neste mês.
          </p>
        ) : (
          transactions.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{t.description}</p>
                <p className="text-xs text-muted-foreground">
                  {SALE_TYPE_LABEL[t.saleType]} · {format(new Date(t.occurredAt), "dd/MM")} ·{" "}
                  {PAYMENT_LABEL[t.paymentMethod]}
                  {t.cardType ? ` (${CARD_TYPE_LABEL[t.cardType]})` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-sm font-semibold text-primary">
                  {formatPriceBRL(t.amountCents)}
                </span>
                {t.feeCents > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    líquido {formatPriceBRL(t.amountCents - t.feeCents)}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar venda</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <div className="grid grid-cols-2 gap-2">
                {MANUAL_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSaleType(t)}
                    className={
                      "rounded-lg border px-2 py-2 text-xs font-medium transition-colors " +
                      (saleType === t
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50")
                    }
                  >
                    {SALE_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sale-desc">Descrição</Label>
              <Input
                id="sale-desc"
                placeholder="Pomada, plano mensal..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sale-amount">Valor</Label>
              <Input
                id="sale-amount"
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
              Registrar venda
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
