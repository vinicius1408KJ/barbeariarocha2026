import type { AppointmentStatus, PaymentMethod } from "@/lib/types"

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  waiting: "Aguardando",
  in_progress: "Em atendimento",
  completed: "Finalizado",
  cancelled: "Cancelado",
  no_show: "Faltou",
}

// Tailwind classes for each status pill.
export const STATUS_PILL: Record<AppointmentStatus, string> = {
  scheduled: "border-border bg-card text-muted-foreground",
  confirmed: "border-primary/40 bg-primary/10 text-primary",
  waiting: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  in_progress: "border-primary bg-primary text-primary-foreground",
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  cancelled: "border-border/60 bg-transparent text-muted-foreground/60",
  no_show: "border-destructive/40 bg-destructive/10 text-destructive",
}

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: "PIX",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  vale: "Vale",
}
