export type Service = {
  id: string
  name: string
  durationMinutes: number
  priceCents: number
  active: boolean
  sortOrder: number
}

export type Barber = {
  id: string
  name: string
  chairNumber: number
  avatarUrl: string | null
  active: boolean
}

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "waiting"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"

export type PaymentMethod = "pix" | "cartao" | "dinheiro" | "vale"

export type Appointment = {
  id: string
  barberId: string
  serviceId: string
  clientName: string
  clientPhone: string
  date: string // "yyyy-MM-dd"
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  status: AppointmentStatus
  pricePaidCents: number | null
  notes: string | null
  isWalkIn: boolean
  paymentMethod: PaymentMethod | null
  completedAt: string | null
  createdAt: string
}

export type BlockedSlot = {
  id: string
  barberId: string
  date: string
  startTime: string
  endTime: string
  reason: string | null
  isImmediate: boolean
}

export type WalkInStatus = "waiting" | "in_progress" | "done" | "left"

export type WalkInEntry = {
  id: string
  clientName: string
  clientPhone: string | null
  serviceId: string | null
  barberId: string | null
  status: WalkInStatus
  arrivedAt: string
  startedAt: string | null
  resultingAppointmentId: string | null
}

// ── Finance (Phase 2) ──────────────────────────────────────────────

export type SaleType = "servico" | "produto" | "assinatura"

// Card sub-type chosen manually at checkout (the app can't detect the brand).
export type CardType = "debito" | "credito_vista" | "credito_parcelado"

// Shop-wide card processing fees, as percentages (e.g. 2.91 = 2,91%).
export type CardFees = {
  debitoPercent: number
  creditoVistaPercent: number
  creditoParceladoPercent: number
}

export type Transaction = {
  id: string
  saleType: SaleType
  barberId: string | null
  appointmentId: string | null
  description: string
  amountCents: number
  paymentMethod: PaymentMethod
  cardType: CardType | null
  feeCents: number
  occurredAt: string
  notes: string | null
}

export type ExpenseCategory =
  | "aluguel"
  | "utilidades"
  | "produtos"
  | "marketing"
  | "manutencao"
  | "impostos"
  | "outros"

export type Expense = {
  id: string
  category: ExpenseCategory
  customLabel: string | null
  amountCents: number
  paymentMethod: PaymentMethod
  occurredAt: string
  notes: string | null
  createdByBarberId: string | null
}

export type CashMovementType = "sangria" | "suprimento"

export type CashMovement = {
  id: string
  type: CashMovementType
  amountCents: number
  reason: string | null
  createdByBarberId: string | null
  occurredAt: string
}

export type Subscription = {
  id: string
  clientName: string
  clientPhone: string
  planName: string
  amountCents: number
  billingDay: number
  active: boolean
}

export type Review = {
  id: string
  appointmentId: string
  barberId: string
  rating: number // 1..5
  comment: string | null
  createdAt: string
}

// Aggregated view of a client's past visits (for the barber).
export type ClientHistory = {
  visits: number
  lastVisitDate: string | null // "yyyy-MM-dd"
  totalSpentCents: number
  favoriteService: string | null
}

export type NotificationType = "new_appointment" | "cancellation"

export type AppNotification = {
  id: string
  barberId: string
  type: NotificationType
  appointmentId: string | null
  title: string
  body: string
  read: boolean
  createdAt: string
}

// Report aggregates
export type CashFlowBucket = {
  period: string // label for the bucket (e.g. "21/07" or "Jul")
  revenueCents: number
  expenseCents: number
  netCents: number
}

export type DRE = {
  revenueByType: Record<SaleType, number>
  revenueTotalCents: number
  expensesByCategory: Record<ExpenseCategory, number>
  expensesTotalCents: number
  cardFeesTotalCents: number
  profitCents: number
}

export type TimeSlot = {
  time: string // "HH:mm"
  available: boolean
}

export type BusinessHours = {
  dayOfWeek: number // 0=Sunday..6=Saturday
  openTime: string // "HH:mm"
  closeTime: string // "HH:mm"
  slotGranularityMinutes: number
}
