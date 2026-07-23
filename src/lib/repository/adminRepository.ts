import { supabase } from "@/lib/supabaseClient"
import { hashPin } from "@/lib/auth/pin"
import { normalizePhone } from "@/lib/utils"
import type {
  Appointment,
  AppointmentStatus,
  AppNotification,
  Barber,
  BlockedSlot,
  CardFees,
  CardType,
  CashFlowBucket,
  CashMovement,
  CashMovementType,
  ClientHistory,
  CommissionSummary,
  DRE,
  Expense,
  ExpenseCategory,
  PaymentMethod,
  Review,
  SaleType,
  Service,
  Subscription,
  Transaction,
  WalkInEntry,
} from "@/lib/types"
import type { AdminRepository, CashFlowGranularity, DateRange } from "./adminTypes"

// Random hex salt for new PINs (matches seed convention).
function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// yyyy-MM-dd (inclusive) → timestamptz bounds for occurred_at filters.
function rangeBounds(range: DateRange): { start: string; end: string } {
  return { start: `${range.from}T00:00:00`, end: `${range.to}T23:59:59.999` }
}

type BarberRow = {
  id: string
  name: string
  chair_number: number
  avatar_url: string | null
  active: boolean
  pin_hash: string | null
  pin_salt: string | null
}

type ServiceRow = {
  id: string
  name: string
  duration_minutes: number
  price_cents: number
  active: boolean
  sort_order: number
}

type AppointmentRow = {
  id: string
  barber_id: string
  service_id: string
  client_name: string
  client_phone: string
  date: string
  start_time: string
  end_time: string
  status: AppointmentStatus
  price_paid_cents: number | null
  notes: string | null
  is_walk_in: boolean
  payment_method: PaymentMethod | null
  completed_at: string | null
  created_at: string
}

type BlockedSlotRow = {
  id: string
  barber_id: string
  date: string
  start_time: string
  end_time: string
  reason: string | null
  is_immediate: boolean
}

type WalkInRow = {
  id: string
  client_name: string
  client_phone: string | null
  service_id: string | null
  barber_id: string | null
  status: WalkInEntry["status"]
  arrived_at: string
  started_at: string | null
  resulting_appointment_id: string | null
}

type NotificationRow = {
  id: string
  barber_id: string
  type: AppNotification["type"]
  appointment_id: string | null
  title: string
  body: string
  read: boolean
  created_at: string
}

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    barberId: row.barber_id,
    type: row.type,
    appointmentId: row.appointment_id,
    title: row.title,
    body: row.body,
    read: row.read,
    createdAt: row.created_at,
  }
}

function mapBarber(row: BarberRow): Barber {
  return {
    id: row.id,
    name: row.name,
    chairNumber: row.chair_number,
    avatarUrl: row.avatar_url,
    active: row.active,
  }
}

function mapService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    durationMinutes: row.duration_minutes,
    priceCents: row.price_cents,
    active: row.active,
    sortOrder: row.sort_order,
  }
}

function mapAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    barberId: row.barber_id,
    serviceId: row.service_id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    date: row.date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    status: row.status,
    pricePaidCents: row.price_paid_cents,
    notes: row.notes,
    isWalkIn: row.is_walk_in,
    paymentMethod: row.payment_method,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }
}

function mapBlockedSlot(row: BlockedSlotRow): BlockedSlot {
  return {
    id: row.id,
    barberId: row.barber_id,
    date: row.date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    reason: row.reason,
    isImmediate: row.is_immediate,
  }
}

function mapWalkIn(row: WalkInRow): WalkInEntry {
  return {
    id: row.id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    serviceId: row.service_id,
    barberId: row.barber_id,
    status: row.status,
    arrivedAt: row.arrived_at,
    startedAt: row.started_at,
    resultingAppointmentId: row.resulting_appointment_id,
  }
}

type ExpenseRow = {
  id: string
  category: ExpenseCategory
  custom_label: string | null
  amount_cents: number
  payment_method: PaymentMethod
  occurred_at: string
  notes: string | null
  created_by_barber_id: string | null
}

type CashMovementRow = {
  id: string
  type: CashMovementType
  amount_cents: number
  reason: string | null
  created_by_barber_id: string | null
  occurred_at: string
}

type TransactionRow = {
  id: string
  sale_type: SaleType
  barber_id: string | null
  appointment_id: string | null
  description: string
  amount_cents: number
  payment_method: PaymentMethod
  card_type: CardType | null
  fee_cents: number | null
  occurred_at: string
  notes: string | null
}

type SubscriptionRow = {
  id: string
  client_name: string
  client_phone: string
  plan_name: string
  amount_cents: number
  billing_day: number
  active: boolean
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    category: row.category,
    customLabel: row.custom_label,
    amountCents: row.amount_cents,
    paymentMethod: row.payment_method,
    occurredAt: row.occurred_at,
    notes: row.notes,
    createdByBarberId: row.created_by_barber_id,
  }
}

function mapCashMovement(row: CashMovementRow): CashMovement {
  return {
    id: row.id,
    type: row.type,
    amountCents: row.amount_cents,
    reason: row.reason,
    createdByBarberId: row.created_by_barber_id,
    occurredAt: row.occurred_at,
  }
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    saleType: row.sale_type,
    barberId: row.barber_id,
    appointmentId: row.appointment_id,
    description: row.description,
    amountCents: row.amount_cents,
    paymentMethod: row.payment_method,
    cardType: row.card_type,
    feeCents: row.fee_cents ?? 0,
    occurredAt: row.occurred_at,
    notes: row.notes,
  }
}

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    planName: row.plan_name,
    amountCents: row.amount_cents,
    billingDay: row.billing_day,
    active: row.active,
  }
}

class SupabaseAdminRepository implements AdminRepository {
  private get client() {
    if (!supabase) throw new Error("Supabase não está configurado. Verifique o arquivo .env.")
    return supabase
  }

  async verifyPin(barberId: string, pin: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("barbers")
      .select("pin_hash, pin_salt")
      .eq("id", barberId)
      .single()
    if (error || !data?.pin_hash || !data?.pin_salt) return false
    const hashed = await hashPin(data.pin_salt, pin)
    return hashed === data.pin_hash
  }

  async listBarbers(): Promise<Barber[]> {
    const { data, error } = await this.client
      .from("barbers")
      .select("*")
      .eq("active", true)
      .order("chair_number", { ascending: true })
    if (error) throw error
    return (data as BarberRow[]).map(mapBarber)
  }

  async listServices(): Promise<Service[]> {
    const { data, error } = await this.client
      .from("services")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true })
    if (error) throw error
    return (data as ServiceRow[]).map(mapService)
  }

  async listAppointmentsForBarber(barberId: string, date: string): Promise<Appointment[]> {
    const { data, error } = await this.client
      .from("appointments")
      .select("*")
      .eq("barber_id", barberId)
      .eq("date", date)
      .order("start_time", { ascending: true })
    if (error) throw error
    return (data as AppointmentRow[]).map(mapAppointment)
  }

  async updateAppointmentStatus(appointmentId: string, status: AppointmentStatus): Promise<void> {
    const { error } = await this.client
      .from("appointments")
      .update({ status })
      .eq("id", appointmentId)
    if (error) throw error
  }

  async completeAppointment(
    appointmentId: string,
    amountCents: number,
    paymentMethod: PaymentMethod,
    cardType: CardType | null = null,
    feeCents = 0
  ): Promise<void> {
    const { error } = await this.client.rpc("complete_appointment", {
      p_appointment_id: appointmentId,
      p_amount_cents: amountCents,
      p_payment_method: paymentMethod,
      p_card_type: paymentMethod === "cartao" ? cardType : null,
      p_fee_cents: paymentMethod === "cartao" ? feeCents : 0,
    })
    if (error) throw error
  }

  // ── Client history + reviews ───────────────────────────────────

  async getClientHistory(phone: string): Promise<ClientHistory> {
    const normalized = normalizePhone(phone)
    const { data, error } = await this.client
      .from("appointments")
      .select("date, price_paid_cents, service_id, services(name)")
      .eq("client_phone", normalized)
      .eq("status", "completed")
      .order("date", { ascending: false })
    if (error) throw error

    type HistoryRow = {
      date: string
      price_paid_cents: number | null
      services: { name: string } | { name: string }[] | null
    }
    const rows = (data ?? []) as unknown as HistoryRow[]

    const totalSpentCents = rows.reduce((s, r) => s + (r.price_paid_cents ?? 0), 0)
    const counts = new Map<string, number>()
    for (const r of rows) {
      const svc = Array.isArray(r.services) ? r.services[0] : r.services
      const name = svc?.name
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    let favoriteService: string | null = null
    let max = 0
    for (const [name, n] of counts) {
      if (n > max) {
        max = n
        favoriteService = name
      }
    }

    return {
      visits: rows.length,
      lastVisitDate: rows[0]?.date ?? null,
      totalSpentCents,
      favoriteService,
    }
  }

  async getAppointmentReview(appointmentId: string): Promise<Review | null> {
    const { data, error } = await this.client
      .from("reviews")
      .select("*")
      .eq("appointment_id", appointmentId)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return {
      id: data.id,
      appointmentId: data.appointment_id,
      barberId: data.barber_id,
      rating: data.rating,
      comment: data.comment,
      createdAt: data.created_at,
    }
  }

  // ── Notifications ──────────────────────────────────────────────

  async listNotifications(barberId: string, limit = 30): Promise<AppNotification[]> {
    const { data, error } = await this.client
      .from("notifications")
      .select("*")
      .eq("barber_id", barberId)
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data as NotificationRow[]).map(mapNotification)
  }

  async getUnreadNotificationCount(barberId: string): Promise<number> {
    const { count, error } = await this.client
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("barber_id", barberId)
      .eq("read", false)
    if (error) throw error
    return count ?? 0
  }

  async markNotificationsRead(barberId: string): Promise<void> {
    const { error } = await this.client
      .from("notifications")
      .update({ read: true })
      .eq("barber_id", barberId)
      .eq("read", false)
    if (error) throw error
  }

  async savePushSubscription(
    barberId: string,
    sub: { endpoint: string; p256dh: string; auth: string }
  ): Promise<void> {
    const { error } = await this.client.from("push_subscriptions").upsert(
      {
        barber_id: barberId,
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
      { onConflict: "endpoint" }
    )
    if (error) throw error
  }

  async removePushSubscription(endpoint: string): Promise<void> {
    const { error } = await this.client
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
    if (error) throw error
  }

  async listBlockedSlots(barberId: string, date: string): Promise<BlockedSlot[]> {
    const { data, error } = await this.client
      .from("blocked_slots")
      .select("*")
      .eq("barber_id", barberId)
      .eq("date", date)
      .order("start_time", { ascending: true })
    if (error) throw error
    return (data as BlockedSlotRow[]).map(mapBlockedSlot)
  }

  async blockSlot(input: {
    barberId: string
    date: string
    startTime: string
    endTime: string
    reason: string | null
    isImmediate: boolean
  }): Promise<BlockedSlot> {
    const { data, error } = await this.client
      .from("blocked_slots")
      .insert({
        barber_id: input.barberId,
        date: input.date,
        start_time: input.startTime,
        end_time: input.endTime,
        reason: input.reason,
        is_immediate: input.isImmediate,
      })
      .select("*")
      .single()
    if (error) throw error
    return mapBlockedSlot(data as BlockedSlotRow)
  }

  async unblockSlot(id: string): Promise<void> {
    const { error } = await this.client.from("blocked_slots").delete().eq("id", id)
    if (error) throw error
  }

  async listWalkInQueue(barberId: string): Promise<WalkInEntry[]> {
    const { data, error } = await this.client
      .from("walk_in_queue")
      .select("*")
      .eq("barber_id", barberId)
      .in("status", ["waiting", "in_progress"])
      .order("arrived_at", { ascending: true })
    if (error) throw error
    return (data as WalkInRow[]).map(mapWalkIn)
  }

  async createWalkIn(input: {
    clientName: string
    clientPhone: string | null
    serviceId: string | null
    barberId: string
  }): Promise<WalkInEntry> {
    const { data, error } = await this.client
      .from("walk_in_queue")
      .insert({
        client_name: input.clientName,
        client_phone: input.clientPhone ? normalizePhone(input.clientPhone) : null,
        service_id: input.serviceId,
        barber_id: input.barberId,
        status: "waiting",
      })
      .select("*")
      .single()
    if (error) throw error
    return mapWalkIn(data as WalkInRow)
  }

  async updateWalkInStatus(id: string, status: WalkInEntry["status"]): Promise<void> {
    const patch: Record<string, unknown> = { status }
    if (status === "in_progress") patch.started_at = new Date().toISOString()
    const { error } = await this.client.from("walk_in_queue").update(patch).eq("id", id)
    if (error) throw error
  }

  // Concludes a walk-in: creates a completed (walk-in) appointment + its
  // transaction and marks the queue entry done — so it counts in the day's
  // revenue, finance and DRE just like a scheduled appointment.
  async completeWalkIn(input: {
    walkInId: string
    serviceId: string
    amountCents: number
    paymentMethod: PaymentMethod
    cardType?: CardType | null
    feeCents?: number
  }): Promise<void> {
    const isCard = input.paymentMethod === "cartao"
    const { error } = await this.client.rpc("complete_walk_in", {
      p_walk_in_id: input.walkInId,
      p_service_id: input.serviceId,
      p_amount_cents: input.amountCents,
      p_payment_method: input.paymentMethod,
      p_card_type: isCard ? (input.cardType ?? null) : null,
      p_fee_cents: isCard ? (input.feeCents ?? 0) : 0,
    })
    if (error) throw error
  }

  // ── Auth / settings ────────────────────────────────────────────

  async changePin(barberId: string, newPin: string): Promise<void> {
    const salt = randomSalt()
    const pin_hash = await hashPin(salt, newPin)
    const { error } = await this.client
      .from("barbers")
      .update({ pin_hash, pin_salt: salt })
      .eq("id", barberId)
    if (error) throw error
  }

  async updateCommissionRate(barberId: string, percent: number): Promise<void> {
    const { error } = await this.client
      .from("barbers")
      .update({ commission_rate_percent: percent })
      .eq("id", barberId)
    if (error) throw error
  }

  // Uploads a photo to the public "avatars" bucket, saves the URL on the
  // barber, and returns the public URL. A per-barber path keeps one photo
  // each and upsert overwrites the previous one.
  async uploadAvatar(barberId: string, file: File): Promise<string> {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
    const path = `${barberId}/avatar.${ext}`
    const { error: upErr } = await this.client.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type || undefined })
    if (upErr) throw upErr

    const { data } = this.client.storage.from("avatars").getPublicUrl(path)
    // Cache-bust so the chair screen shows the new photo immediately.
    const url = `${data.publicUrl}?v=${Date.now()}`
    await this.updateBarberAvatar(barberId, url)
    return url
  }

  async updateBarberAvatar(barberId: string, avatarUrl: string | null): Promise<void> {
    const { error } = await this.client
      .from("barbers")
      .update({ avatar_url: avatarUrl })
      .eq("id", barberId)
    if (error) throw error
  }

  // ── Settings — card fees ───────────────────────────────────────

  async getCardFees(): Promise<CardFees> {
    const { data, error } = await this.client
      .from("app_settings")
      .select(
        "card_fee_debito_percent, card_fee_credito_vista_percent, card_fee_credito_parcelado_percent"
      )
      .eq("id", 1)
      .maybeSingle()
    if (error) throw error
    return {
      debitoPercent: Number(data?.card_fee_debito_percent ?? 0),
      creditoVistaPercent: Number(data?.card_fee_credito_vista_percent ?? 0),
      creditoParceladoPercent: Number(data?.card_fee_credito_parcelado_percent ?? 0),
    }
  }

  async updateCardFees(fees: CardFees): Promise<void> {
    const { error } = await this.client.from("app_settings").upsert({
      id: 1,
      card_fee_debito_percent: fees.debitoPercent,
      card_fee_credito_vista_percent: fees.creditoVistaPercent,
      card_fee_credito_parcelado_percent: fees.creditoParceladoPercent,
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
  }

  // ── Expenses ───────────────────────────────────────────────────

  async listExpenses(range: DateRange): Promise<Expense[]> {
    const { start, end } = rangeBounds(range)
    const { data, error } = await this.client
      .from("expenses")
      .select("*")
      .gte("occurred_at", start)
      .lte("occurred_at", end)
      .order("occurred_at", { ascending: false })
    if (error) throw error
    return (data as ExpenseRow[]).map(mapExpense)
  }

  async createExpense(input: {
    category: ExpenseCategory
    customLabel: string | null
    amountCents: number
    paymentMethod: PaymentMethod
    notes: string | null
    createdByBarberId: string
  }): Promise<Expense> {
    const { data, error } = await this.client
      .from("expenses")
      .insert({
        category: input.category,
        custom_label: input.customLabel,
        amount_cents: input.amountCents,
        payment_method: input.paymentMethod,
        notes: input.notes,
        created_by_barber_id: input.createdByBarberId,
      })
      .select("*")
      .single()
    if (error) throw error
    return mapExpense(data as ExpenseRow)
  }

  async deleteExpense(id: string): Promise<void> {
    const { error } = await this.client.from("expenses").delete().eq("id", id)
    if (error) throw error
  }

  // ── Cash movements ─────────────────────────────────────────────

  async listCashMovements(range: DateRange): Promise<CashMovement[]> {
    const { start, end } = rangeBounds(range)
    const { data, error } = await this.client
      .from("cash_movements")
      .select("*")
      .gte("occurred_at", start)
      .lte("occurred_at", end)
      .order("occurred_at", { ascending: false })
    if (error) throw error
    return (data as CashMovementRow[]).map(mapCashMovement)
  }

  async createCashMovement(input: {
    type: CashMovementType
    amountCents: number
    reason: string | null
    createdByBarberId: string
  }): Promise<CashMovement> {
    const { data, error } = await this.client
      .from("cash_movements")
      .insert({
        type: input.type,
        amount_cents: input.amountCents,
        reason: input.reason,
        created_by_barber_id: input.createdByBarberId,
      })
      .select("*")
      .single()
    if (error) throw error
    return mapCashMovement(data as CashMovementRow)
  }

  // ── Transactions ───────────────────────────────────────────────

  async listTransactions(range: DateRange): Promise<Transaction[]> {
    const { start, end } = rangeBounds(range)
    const { data, error } = await this.client
      .from("transactions")
      .select("*")
      .gte("occurred_at", start)
      .lte("occurred_at", end)
      .order("occurred_at", { ascending: false })
    if (error) throw error
    return (data as TransactionRow[]).map(mapTransaction)
  }

  async createTransaction(input: {
    saleType: SaleType
    barberId: string | null
    description: string
    amountCents: number
    paymentMethod: PaymentMethod
    notes: string | null
  }): Promise<Transaction> {
    const { data, error } = await this.client
      .from("transactions")
      .insert({
        sale_type: input.saleType,
        barber_id: input.barberId,
        description: input.description,
        amount_cents: input.amountCents,
        payment_method: input.paymentMethod,
        notes: input.notes,
      })
      .select("*")
      .single()
    if (error) throw error
    return mapTransaction(data as TransactionRow)
  }

  // ── Subscriptions ──────────────────────────────────────────────

  async listSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await this.client
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) throw error
    return (data as SubscriptionRow[]).map(mapSubscription)
  }

  async createSubscription(input: {
    clientName: string
    clientPhone: string
    planName: string
    amountCents: number
    billingDay: number
  }): Promise<Subscription> {
    const { data, error } = await this.client
      .from("subscriptions")
      .insert({
        client_name: input.clientName,
        client_phone: normalizePhone(input.clientPhone),
        plan_name: input.planName,
        amount_cents: input.amountCents,
        billing_day: input.billingDay,
      })
      .select("*")
      .single()
    if (error) throw error
    return mapSubscription(data as SubscriptionRow)
  }

  async updateSubscriptionActive(id: string, active: boolean): Promise<void> {
    const { error } = await this.client.from("subscriptions").update({ active }).eq("id", id)
    if (error) throw error
  }

  // ── Reports ────────────────────────────────────────────────────

  async getCashFlow(range: DateRange, granularity: CashFlowGranularity): Promise<CashFlowBucket[]> {
    const [transactions, expenses] = await Promise.all([
      this.listTransactions(range),
      this.listExpenses(range),
    ])

    const bucketKey = (iso: string): string => {
      const d = new Date(iso)
      if (granularity === "month") {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      }
      if (granularity === "week") {
        const onejan = new Date(d.getFullYear(), 0, 1)
        const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7)
        return `${d.getFullYear()}-S${String(week).padStart(2, "0")}`
      }
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
    }

    const buckets = new Map<string, { revenue: number; expense: number }>()
    for (const t of transactions) {
      const k = bucketKey(t.occurredAt)
      const b = buckets.get(k) ?? { revenue: 0, expense: 0 }
      b.revenue += t.amountCents
      buckets.set(k, b)
    }
    for (const e of expenses) {
      const k = bucketKey(e.occurredAt)
      const b = buckets.get(k) ?? { revenue: 0, expense: 0 }
      b.expense += e.amountCents
      buckets.set(k, b)
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => ({
        period,
        revenueCents: v.revenue,
        expenseCents: v.expense,
        netCents: v.revenue - v.expense,
      }))
  }

  async getDRE(range: DateRange): Promise<DRE> {
    const [transactions, expenses, commissions] = await Promise.all([
      this.listTransactions(range),
      this.listExpenses(range),
      this.getCommissions(range),
    ])

    const revenueByType: Record<SaleType, number> = { servico: 0, produto: 0, assinatura: 0 }
    for (const t of transactions) revenueByType[t.saleType] += t.amountCents
    const revenueTotalCents = transactions.reduce((s, t) => s + t.amountCents, 0)

    const expensesByCategory: Record<ExpenseCategory, number> = {
      aluguel: 0,
      utilidades: 0,
      produtos: 0,
      comissoes: 0,
      marketing: 0,
      manutencao: 0,
      impostos: 0,
      outros: 0,
    }
    for (const e of expenses) expensesByCategory[e.category] += e.amountCents
    const expensesTotalCents = expenses.reduce((s, e) => s + e.amountCents, 0)

    const commissionsTotalCents = commissions.reduce((s, c) => s + c.commissionCents, 0)
    const cardFeesTotalCents = transactions.reduce((s, t) => s + (t.feeCents ?? 0), 0)
    const profitCents =
      revenueTotalCents - expensesTotalCents - commissionsTotalCents - cardFeesTotalCents

    return {
      revenueByType,
      revenueTotalCents,
      expensesByCategory,
      expensesTotalCents,
      commissionsTotalCents,
      cardFeesTotalCents,
      profitCents,
    }
  }

  async getCommissions(range: DateRange): Promise<CommissionSummary[]> {
    const [barbers, transactions] = await Promise.all([
      this.listBarbers(),
      this.listTransactions(range),
    ])

    // fetch commission rates
    const { data: rateRows } = await this.client
      .from("barbers")
      .select("id, commission_rate_percent")
    const rateOf = new Map<string, number>(
      (rateRows ?? []).map((r: { id: string; commission_rate_percent: number }) => [
        r.id,
        Number(r.commission_rate_percent),
      ])
    )

    return barbers.map((barber) => {
      const serviceRevenueCents = transactions
        .filter((t) => t.saleType === "servico" && t.barberId === barber.id)
        .reduce((s, t) => s + t.amountCents, 0)
      const rate = rateOf.get(barber.id) ?? 0
      return {
        barberId: barber.id,
        barberName: barber.name,
        serviceRevenueCents,
        commissionRatePercent: rate,
        commissionCents: Math.round((serviceRevenueCents * rate) / 100),
      }
    })
  }

  async getCashForecast(): Promise<{
    subscriptionsMonthlyCents: number
    upcomingAppointmentsCents: number
  }> {
    const subs = await this.listSubscriptions()
    const subscriptionsMonthlyCents = subs
      .filter((s) => s.active)
      .reduce((s, sub) => s + sub.amountCents, 0)

    // Upcoming scheduled appointments (from today forward) × their service price
    const today = new Date().toISOString().slice(0, 10)
    const { data: appts } = await this.client
      .from("appointments")
      .select("service_id, status, date")
      .gte("date", today)
      .in("status", ["scheduled", "confirmed", "waiting", "in_progress"])
    const { data: services } = await this.client.from("services").select("id, price_cents")
    const priceOf = new Map<string, number>(
      (services ?? []).map((s: { id: string; price_cents: number }) => [s.id, s.price_cents])
    )
    const upcomingAppointmentsCents = (appts ?? []).reduce(
      (sum: number, a: { service_id: string }) => sum + (priceOf.get(a.service_id) ?? 0),
      0
    )

    return { subscriptionsMonthlyCents, upcomingAppointmentsCents }
  }
}

export const adminRepository = new SupabaseAdminRepository()
