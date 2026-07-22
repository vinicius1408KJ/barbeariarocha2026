import { useEffect, useState } from "react"
import { CheckCircle2, MessageCircle, X } from "lucide-react"
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
import { PAYMENT_LABEL, STATUS_LABEL } from "@/lib/statusLabels"
import { formatPhone, formatPriceBRL } from "@/lib/utils"
import type {
  Appointment,
  AppointmentStatus,
  CardFees,
  CardType,
  PaymentMethod,
  Service,
} from "@/lib/types"

const PAYMENT_METHODS: PaymentMethod[] = ["pix", "cartao", "dinheiro", "vale"]

const ZERO_FEES: CardFees = { debitoPercent: 0, creditoVistaPercent: 0, creditoParceladoPercent: 0 }

// Which status a barber can move to next, given the current one.
const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  scheduled: ["confirmed", "no_show"],
  confirmed: ["waiting", "no_show"],
  waiting: ["in_progress", "no_show"],
  in_progress: [],
}

function waLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "")
  const full = digits.startsWith("55") ? digits : `55${digits}`
  return `https://wa.me/${full}?text=${encodeURIComponent(message)}`
}

export function AppointmentDetailDialog({
  appointment,
  service,
  barberName,
  open,
  onOpenChange,
  onChanged,
}: {
  appointment: Appointment | null
  service: Service | undefined
  barberName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const [amount, setAmount] = useState("")
  const [payment, setPayment] = useState<PaymentMethod | null>(null)
  const [cardType, setCardType] = useState<CardType | null>(null)
  const [fees, setFees] = useState<CardFees>(ZERO_FEES)
  const [busy, setBusy] = useState(false)

  // Load configured card fees once when the dialog opens.
  useEffect(() => {
    if (!open) return
    adminRepository.getCardFees().then(setFees).catch(() => setFees(ZERO_FEES))
  }, [open])

  // Reset payment selection whenever the dialog opens for a new appointment.
  useEffect(() => {
    if (open) {
      setAmount("")
      setPayment(null)
      setCardType(null)
    }
  }, [open, appointment?.id])

  if (!appointment) return null

  const priceDefault = service ? formatPriceBRL(service.priceCents) : ""
  const isCompletable = appointment.status === "in_progress"

  const grossCents = amount
    ? Math.round(parseFloat(amount.replace(",", ".")) * 100) || 0
    : (service?.priceCents ?? 0)
  const feeCents = payment === "cartao" && cardType ? cardFeeCents(fees, cardType, grossCents) : 0
  const netCents = grossCents - feeCents

  async function setStatus(status: AppointmentStatus) {
    if (!appointment) return
    setBusy(true)
    try {
      await adminRepository.updateAppointmentStatus(appointment.id, status)
      toast.success(`Status: ${STATUS_LABEL[status]}`)
      onChanged()
      if (status !== "in_progress") onOpenChange(false)
    } catch {
      toast.error("Não foi possível atualizar o status.")
    } finally {
      setBusy(false)
    }
  }

  async function complete() {
    if (!appointment) return
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
      await adminRepository.completeAppointment(
        appointment.id,
        grossCents,
        payment,
        payment === "cartao" ? cardType : null,
        feeCents
      )
      toast.success("Atendimento finalizado!")
      onChanged()
      onOpenChange(false)
    } catch {
      toast.error("Não foi possível finalizar o atendimento.")
    } finally {
      setBusy(false)
    }
  }

  const reminderDay = `Olá ${appointment.clientName}! Passando para lembrar do seu horário na Barbearia Rocha amanhã às ${appointment.startTime} com ${barberName}. Até lá!`
  const reminder2h = `Olá ${appointment.clientName}! Seu horário na Barbearia Rocha é hoje às ${appointment.startTime} com ${barberName}. Te esperamos!`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {appointment.startTime} · {service?.name ?? "Serviço"}
          </DialogTitle>
          <DialogDescription>
            {appointment.clientName} · {formatPhone(appointment.clientPhone)}
            {appointment.isWalkIn && " · Walk-in"}
          </DialogDescription>
        </DialogHeader>

        {appointment.status === "completed" ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-400">
            <CheckCircle2 className="size-4" />
            Finalizado ·{" "}
            {appointment.pricePaidCents != null && formatPriceBRL(appointment.pricePaidCents)}
            {appointment.paymentMethod && ` · ${PAYMENT_LABEL[appointment.paymentMethod]}`}
          </div>
        ) : appointment.status === "cancelled" || appointment.status === "no_show" ? (
          <div className="rounded-lg border border-border/60 px-3 py-2.5 text-sm text-muted-foreground">
            {STATUS_LABEL[appointment.status]}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {(NEXT_STATUS[appointment.status] ?? []).map((next) => (
                <Button
                  key={next}
                  variant={next === "no_show" ? "destructive" : "outline"}
                  size="sm"
                  disabled={busy}
                  onClick={() => setStatus(next)}
                >
                  {next === "no_show" ? <X className="size-3.5" /> : null}
                  {STATUS_LABEL[next]}
                </Button>
              ))}
            </div>

            {isCompletable && (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount">Valor recebido</Label>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    placeholder={priceDefault}
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

                <Button disabled={busy} onClick={complete} className="h-10">
                  <CheckCircle2 className="size-4" />
                  Finalizar atendimento
                </Button>
              </div>
            )}
          </>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Lembrete WhatsApp
          </p>
          <div className="flex gap-2">
            <Button
              render={<a href={waLink(appointment.clientPhone, reminderDay)} target="_blank" rel="noreferrer" />}
              nativeButton={false}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <MessageCircle className="size-3.5" />
              Véspera
            </Button>
            <Button
              render={<a href={waLink(appointment.clientPhone, reminder2h)} target="_blank" rel="noreferrer" />}
              nativeButton={false}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <MessageCircle className="size-3.5" />
              2h antes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
