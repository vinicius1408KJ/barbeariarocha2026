import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react"
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
import { CASH_MOVEMENT_LABEL } from "@/lib/financeLabels"
import { formatPriceBRL } from "@/lib/utils"
import type { CashMovement, CashMovementType } from "@/lib/types"

function monthRange() {
  const now = new Date()
  const from = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd")
  const to = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd")
  return { from, to }
}

export function CashTab() {
  const { session } = useStaffSession()
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<CashMovementType>("suprimento")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setMovements(await adminRepository.listCashMovements(monthRange()))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openWith(t: CashMovementType) {
    setType(t)
    setAmount("")
    setReason("")
    setOpen(true)
  }

  async function submit() {
    const cents = Math.round(parseFloat(amount.replace(",", ".")) * 100)
    if (!cents || cents <= 0) {
      toast.error("Informe um valor válido.")
      return
    }
    setBusy(true)
    try {
      await adminRepository.createCashMovement({
        type,
        amountCents: cents,
        reason: reason.trim() || null,
        createdByBarberId: session!.barberId,
      })
      toast.success(`${CASH_MOVEMENT_LABEL[type]} registrada.`)
      setOpen(false)
      load()
    } catch {
      toast.error("Não foi possível registrar.")
    } finally {
      setBusy(false)
    }
  }

  const suprimentos = movements.filter((m) => m.type === "suprimento").reduce((s, m) => s + m.amountCents, 0)
  const sangrias = movements.filter((m) => m.type === "sangria").reduce((s, m) => s + m.amountCents, 0)

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => openWith("suprimento")}
          className="flex flex-col items-start gap-1 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] px-4 py-3 text-left transition-colors hover:border-emerald-500/40"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-emerald-400 uppercase">
            <ArrowUpCircle className="size-3.5" />
            Suprimento
          </span>
          <span className="text-lg font-semibold text-foreground">{formatPriceBRL(suprimentos)}</span>
        </button>
        <button
          type="button"
          onClick={() => openWith("sangria")}
          className="flex flex-col items-start gap-1 rounded-xl border border-destructive/25 bg-destructive/[0.05] px-4 py-3 text-left transition-colors hover:border-destructive/40"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-destructive uppercase">
            <ArrowDownCircle className="size-3.5" />
            Sangria
          </span>
          <span className="text-lg font-semibold text-foreground">{formatPriceBRL(sangrias)}</span>
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
        ) : movements.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Nenhuma movimentação neste mês.
          </p>
        ) : (
          movements.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{CASH_MOVEMENT_LABEL[m.type]}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {format(new Date(m.occurredAt), "dd/MM HH:mm")}
                  {m.reason && ` · ${m.reason}`}
                </p>
              </div>
              <span
                className={
                  "text-sm font-semibold " +
                  (m.type === "suprimento" ? "text-emerald-400" : "text-destructive")
                }
              >
                {m.type === "suprimento" ? "+" : "−"}
                {formatPriceBRL(m.amountCents)}
              </span>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{CASH_MOVEMENT_LABEL[type]} de caixa</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cash-amount">Valor</Label>
              <Input
                id="cash-amount"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cash-reason">Motivo (opcional)</Label>
              <Input
                id="cash-reason"
                placeholder="Troco, pagamento fornecedor..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <Button disabled={busy} onClick={submit} className="mt-1 h-10">
              Registrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
