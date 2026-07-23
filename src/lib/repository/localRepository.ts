import { SEED_BARBERS, SEED_BUSINESS_HOURS, SEED_SERVICES } from "@/lib/seedData"
import type {
  Appointment,
  Barber,
  BlockedSlot,
  BusinessHours,
  Review,
  Service,
  TimeSlot,
} from "@/lib/types"
import { intervalsOverlap, minutesToTime, normalizePhone, timeToMinutes } from "@/lib/utils"
import type { BookingRepository } from "./types"

const KEYS = {
  services: "br_services",
  barbers: "br_barbers",
  appointments: "br_appointments",
  blockedSlots: "br_blocked_slots",
  businessHours: "br_business_hours",
  reviews: "br_reviews",
} as const

function readStore<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback))
    return fallback
  }
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeStore<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function uuid(): string {
  return crypto.randomUUID()
}

class LocalBookingRepository implements BookingRepository {
  readonly mode = "local" as const

  async listServices(): Promise<Service[]> {
    const services = readStore(KEYS.services, SEED_SERVICES)
    return services.filter((s) => s.active).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async listBarbers(): Promise<Barber[]> {
    const barbers = readStore(KEYS.barbers, SEED_BARBERS)
    return barbers.filter((b) => b.active)
  }

  async getAvailableSlots(params: {
    barberId: string
    date: string
    serviceDurationMinutes: number
  }): Promise<TimeSlot[]> {
    const { barberId, date, serviceDurationMinutes } = params
    const businessHours = readStore(KEYS.businessHours, SEED_BUSINESS_HOURS)
    const dayOfWeek = new Date(`${date}T00:00:00`).getDay()
    const hours = businessHours.find((h: BusinessHours) => h.dayOfWeek === dayOfWeek)

    if (!hours) return []

    const appointments = readStore<Appointment[]>(KEYS.appointments, [])
    const blockedSlots = readStore<BlockedSlot[]>(KEYS.blockedSlots, [])

    const busyIntervals = [
      ...appointments
        .filter((a) => a.barberId === barberId && a.date === date && a.status !== "cancelled")
        .map((a) => ({ start: timeToMinutes(a.startTime), end: timeToMinutes(a.endTime) })),
      ...blockedSlots
        .filter((b) => b.barberId === barberId && b.date === date)
        .map((b) => ({ start: timeToMinutes(b.startTime), end: timeToMinutes(b.endTime) })),
    ]

    const openMinutes = timeToMinutes(hours.openTime)
    const closeMinutes = timeToMinutes(hours.closeTime)
    const granularity = hours.slotGranularityMinutes

    const now = new Date()
    const isToday = date === now.toISOString().slice(0, 10)
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    const slots: TimeSlot[] = []
    for (let start = openMinutes; start + serviceDurationMinutes <= closeMinutes; start += granularity) {
      const end = start + serviceDurationMinutes
      const inPast = isToday && start <= nowMinutes
      const overlapsBusy = busyIntervals.some((busy) =>
        intervalsOverlap(start, end, busy.start, busy.end)
      )
      slots.push({ time: minutesToTime(start), available: !inPast && !overlapsBusy })
    }

    return slots
  }

  async createAppointment(input: {
    barberId: string
    serviceId: string
    date: string
    startTime: string
    clientName: string
    clientPhone: string
  }): Promise<Appointment> {
    const services = readStore(KEYS.services, SEED_SERVICES)
    const service = services.find((s) => s.id === input.serviceId)
    if (!service) throw new Error("Serviço não encontrado")

    const endTime = minutesToTime(timeToMinutes(input.startTime) + service.durationMinutes)

    const appointment: Appointment = {
      id: uuid(),
      barberId: input.barberId,
      serviceId: input.serviceId,
      clientName: input.clientName,
      clientPhone: normalizePhone(input.clientPhone),
      date: input.date,
      startTime: input.startTime,
      endTime,
      status: "scheduled",
      pricePaidCents: null,
      notes: null,
      isWalkIn: false,
      paymentMethod: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    }

    const appointments = readStore<Appointment[]>(KEYS.appointments, [])
    appointments.push(appointment)
    writeStore(KEYS.appointments, appointments)

    return appointment
  }

  async getAppointmentsByPhone(phone: string): Promise<Appointment[]> {
    const appointments = readStore<Appointment[]>(KEYS.appointments, [])
    const normalized = normalizePhone(phone)
    return appointments
      .filter((a) => a.clientPhone === normalized)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
  }

  async cancelAppointment(appointmentId: string): Promise<void> {
    const appointments = readStore<Appointment[]>(KEYS.appointments, [])
    const updated = appointments.map((a) =>
      a.id === appointmentId ? { ...a, status: "cancelled" as const } : a
    )
    writeStore(KEYS.appointments, updated)
  }

  async getOpenWeekdays(): Promise<number[]> {
    const businessHours = readStore(KEYS.businessHours, SEED_BUSINESS_HOURS)
    const days = new Set(businessHours.map((h: BusinessHours) => h.dayOfWeek))
    return [...days].sort((a, b) => a - b)
  }

  async submitReview(input: {
    appointmentId: string
    barberId: string
    rating: number
    comment: string | null
  }): Promise<void> {
    const reviews = readStore<Review[]>(KEYS.reviews, [])
    const filtered = reviews.filter((r) => r.appointmentId !== input.appointmentId)
    filtered.push({
      id: uuid(),
      appointmentId: input.appointmentId,
      barberId: input.barberId,
      rating: input.rating,
      comment: input.comment,
      createdAt: new Date().toISOString(),
    })
    writeStore(KEYS.reviews, filtered)
  }

  async getReviews(appointmentIds: string[]): Promise<Review[]> {
    const reviews = readStore<Review[]>(KEYS.reviews, [])
    return reviews.filter((r) => appointmentIds.includes(r.appointmentId))
  }
}

export const localBookingRepository = new LocalBookingRepository()
