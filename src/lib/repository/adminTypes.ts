import type {
  Appointment,
  AppointmentStatus,
  AppNotification,
  Barber,
  BlockedSlot,
  BusinessHours,
  CardFees,
  CardType,
  CashFlowBucket,
  CashMovement,
  CashMovementType,
  ClientHistory,
  DRE,
  Expense,
  ExpenseCategory,
  PaymentMethod,
  Product,
  ReminderSettings,
  Review,
  SaleType,
  Service,
  Subscription,
  Transaction,
  WalkInEntry,
} from "@/lib/types"

export type DateRange = { from: string; to: string } // "yyyy-MM-dd" inclusive

export type CashFlowGranularity = "day" | "week" | "month"

export type LoginBarber = Barber & { authEmail: string }

export interface AdminRepository {
  // Auth — real Supabase Auth session under the hood (not a client-forgeable
  // sessionStorage flag). PIN is the account's password.
  listBarbersForLogin(): Promise<LoginBarber[]>
  verifyPin(authEmail: string, pin: string): Promise<boolean>
  changePin(newPin: string): Promise<void>
  logout(): Promise<void>
  // Barber id embedded in the current session's JWT, or null if signed out.
  getCurrentBarberId(): Promise<string | null>

  // Catalog
  listBarbers(): Promise<Barber[]>
  listServices(): Promise<Service[]>

  // Products + inventory
  listProducts(): Promise<Product[]>
  createProduct(input: { name: string; priceCents: number; stock: number }): Promise<Product>
  updateProduct(
    id: string,
    patch: Partial<{ name: string; priceCents: number; stock: number; active: boolean }>
  ): Promise<void>
  deleteProduct(id: string): Promise<void>
  sellProduct(input: { productId: string; qty: number; paymentMethod: PaymentMethod }): Promise<void>

  // Services management
  listAllServices(): Promise<Service[]>
  createService(input: { name: string; durationMinutes: number; priceCents: number }): Promise<Service>
  updateService(
    id: string,
    patch: Partial<{ name: string; durationMinutes: number; priceCents: number; active: boolean }>
  ): Promise<void>
  deleteService(id: string): Promise<"deleted" | "deactivated">

  // Business hours
  listBusinessHours(): Promise<BusinessHours[]>
  saveBusinessHours(days: BusinessHours[]): Promise<void>
  uploadAvatar(barberId: string, file: File): Promise<string>
  updateBarberAvatar(barberId: string, avatarUrl: string | null): Promise<void>

  // Settings — card fees
  getCardFees(): Promise<CardFees>
  updateCardFees(fees: CardFees): Promise<void>

  // Settings — automatic reminders
  getReminderSettings(): Promise<ReminderSettings>
  updateReminderSettings(settings: ReminderSettings): Promise<void>

  // Agenda
  listAppointmentsForBarber(barberId: string, date: string): Promise<Appointment[]>
  updateAppointmentStatus(appointmentId: string, status: AppointmentStatus): Promise<void>
  completeAppointment(
    appointmentId: string,
    amountCents: number,
    paymentMethod: PaymentMethod,
    cardType?: CardType | null,
    feeCents?: number
  ): Promise<void>
  createManualAppointment(input: {
    barberId: string
    services: Service[]
    date: string
    startTime: string
    clientName: string
    clientPhone: string | null
  }): Promise<Appointment>

  // Time blocking
  listBlockedSlots(barberId: string, date: string): Promise<BlockedSlot[]>
  blockSlot(input: {
    barberId: string
    date: string
    startTime: string
    endTime: string
    reason: string | null
    isImmediate: boolean
  }): Promise<BlockedSlot>
  unblockSlot(id: string): Promise<void>

  // Walk-in queue
  listWalkInQueue(barberId: string): Promise<WalkInEntry[]>
  createWalkIn(input: {
    clientName: string
    clientPhone: string | null
    serviceIds: string[]
    barberId: string
  }): Promise<WalkInEntry>
  updateWalkInStatus(id: string, status: WalkInEntry["status"]): Promise<void>
  completeWalkIn(input: {
    walkInId: string
    serviceIds: string[]
    amountCents: number
    paymentMethod: PaymentMethod
    cardType?: CardType | null
    feeCents?: number
  }): Promise<void>

  // Client history + reviews (barber view)
  getClientHistory(phone: string): Promise<ClientHistory>
  getAppointmentReview(appointmentId: string): Promise<Review | null>

  // Finance — expenses
  listExpenses(range: DateRange): Promise<Expense[]>
  createExpense(input: {
    category: ExpenseCategory
    customLabel: string | null
    amountCents: number
    paymentMethod: PaymentMethod
    notes: string | null
    createdByBarberId: string
  }): Promise<Expense>
  deleteExpense(id: string): Promise<void>

  // Finance — cash movements (sangria / suprimento)
  listCashMovements(range: DateRange): Promise<CashMovement[]>
  createCashMovement(input: {
    type: CashMovementType
    amountCents: number
    reason: string | null
    createdByBarberId: string
  }): Promise<CashMovement>

  // Finance — transactions (product / subscription sales, plus service via completion)
  listTransactions(range: DateRange): Promise<Transaction[]>
  createTransaction(input: {
    saleType: SaleType
    barberId: string | null
    description: string
    amountCents: number
    paymentMethod: PaymentMethod
    notes: string | null
  }): Promise<Transaction>

  // Subscriptions
  listSubscriptions(): Promise<Subscription[]>
  createSubscription(input: {
    clientName: string
    clientPhone: string
    planName: string
    amountCents: number
    billingDay: number
  }): Promise<Subscription>
  updateSubscriptionActive(id: string, active: boolean): Promise<void>

  // Notifications
  listNotifications(barberId: string, limit?: number): Promise<AppNotification[]>
  getUnreadNotificationCount(barberId: string): Promise<number>
  markNotificationsRead(barberId: string): Promise<void>
  deleteNotification(id: string): Promise<void>
  clearNotifications(barberId: string): Promise<void>

  // Push subscriptions
  savePushSubscription(
    barberId: string,
    sub: { endpoint: string; p256dh: string; auth: string }
  ): Promise<void>
  removePushSubscription(endpoint: string): Promise<void>

  // Reports
  getCashFlow(range: DateRange, granularity: CashFlowGranularity): Promise<CashFlowBucket[]>
  getDRE(range: DateRange): Promise<DRE>
  // Personal earnings for one barber (service sales only) in the period.
  getBarberEarnings(
    barberId: string,
    range: DateRange
  ): Promise<{ serviceRevenueCents: number; appointments: number; ticketAvgCents: number }>
  getCashForecast(): Promise<{ subscriptionsMonthlyCents: number; upcomingAppointmentsCents: number }>
}
