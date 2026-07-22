import { useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { adminRepository } from "@/lib/repository/adminRepository"
import { CARD_TYPES, CARD_TYPE_LABEL } from "@/lib/financeLabels"
import { cardFeeCents, cardFeePercent } from "@/lib/cardFees"
import { PAYMENT_LABEL } from "@/lib/statusLabels"
import { formatPriceBRL } from "@/lib/utils"
import type { CardFees, CardType, PaymentMethod, Service, WalkInEntry } from "@/lib/types"

const PAYMENT_METHODS: PaymentMethod[] = ["pix", "cartao", "dinheiro", "vale"]
const ZERO_FEES: CardFees = { debitoPercent: 0, creditoVistaPercent: 0, creditoParceladoPercent: 0 }

export function WalkInCompleteDialog({
  walkIn,
  services,
  open,
  onOpenChange,
  onDone,
}: {
  walkIn: WalkInEntry | null
  services: Service[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}) {
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [payment, setPayment] = useState<PaymentMethod | null>(null)
  const [cardType, setCardType] = useState<CardType | null>(null)
  const [fees, setFees] = useState<CardFees>(ZERO_FEES)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    adminRepository.getCardFees().then(setFees).catch(() => setFees(ZERO_FEES))
  }, [open])

  // Prefill from the walk-in's chosen service (if any) when opening.
  useEffect(() => {
    if (open) {
      setServiceId(walkIn?.serviceId ?? null)
      setAmount("")
      setPayment(null)
      setCardType(null)
    }
  }, [open, walkIn?.id, walkIn?.serviceId])

  if (!walkIn) return null

  const service = services.find((s) => s.id === serviceId)
  const grossCents = amount
    ? Math.round(parseFloat(amount.replace(",", ".")) * 100) || 0
    : (service?.priceCents ?? 0)
  const feeCents = payment === "cartao" && cardType ? cardFeeCents(fees, cardType, grossCents) : 0
  const netCents = grossCents - feeCents

  async function submit() {
    if (!walkIn) return
    if (!serviceId) {
      toast.error("Selecione o serviço.")
      return
    }
    if (!payment) {
      toast.error("Selecione a forma de pagamento.")
      return
    }
    if (payment === "cartao" && !cardType) {
      toast.error("Selecione o tipo de cartão.")
      return
    }
    setBusy(true)
    try {
      await adminRepository.completeWalkIn({
        walkInId: walkIn.id,
        serviceId,
        amountCents: grossCents,
        paymentMethod: payment,
        cardType: payment === "cartao" ? cardType : null,
        feeCents,
      })
      toast.success("Walk-in finalizado!")
      onDone()
      onOpenChange(false)
    } catch {
      toast.error("Não foi possível finalizar o walk-in.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalizar walk-in</DialogTitle>
          <DialogDescription>{walkIn.clientName}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Serviço</Label>
            <div className="grid grid-cols-2 gap-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServiceId(s.id)}
                  className={
                    "h-9 rounded-lg border px-2 text-xs font-medium transition-colors " +
                    (serviceId === s.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/50")
                  }
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wi-amount">Valor recebido</Label>
            <Input
              id="wi-amount"
              inputMode="decimal"
              placeholder={service ? formatPriceBRL(service.priceCents) : "0,00"}
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
                  onClick={() => {
                    setPayment(m)
                    if (m !== "cartao") setCardType(null)
                  }}
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

          {payment === "cartao" && (
            <div className="flex flex-col gap-1.5">
              <Label>Tipo de cartão</Label>
              <div className="grid grid-cols-3 gap-2">
                {CARD_TYPES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCardType(c)}
                    className={
                      "flex h-auto flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-xs font-medium transition-colors " +
                      (cardType === c
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50")
                    }
                  >
                    <span className="text-center leading-tight">{CARD_TYPE_LABEL[c]}</span>
                    <span className="text-[10px] opacity-80">
                      {cardFeePercent(fees, c).toString().replace(".", ",")}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {payment === "cartao" && cardType && (
            <div className="flex flex-col gap-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Valor bruto</span>
                <span>{formatPriceBRL(grossCents)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>
                  Taxa {CARD_TYPE_LABEL[cardType].toLowerCase()} (
                  {cardFeePercent(fees, cardType).toString().replace(".", ",")}%)
                </span>
                <span>−{formatPriceBRL(feeCents)}</span>
              </div>
              <div className="mt-0.5 flex justify-between border-t border-border pt-1 font-semibold text-foreground">
                <span>Você recebe</span>
                <span className="text-emerald-400">{formatPriceBRL(netCents)}</span>
              </div>
            </div>
          )}

          <Button disabled={busy} onClick={submit} className="mt-1 h-10">
            <CheckCircle2 className="size-4" />
            Finalizar walk-in
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
