import { supabase } from "@/lib/supabaseClient"
import type { Appointment, Barber, Review, Service, TimeSlot } from "@/lib/types"
import { intervalsOverlap, minutesToTime, normalizePhone, timeToMinutes } from "@/lib/utils"
import type { BookingRepository } from "./types"

type ServiceRow = {
  id: string
  name: string
  duration_minutes: number
  price_cents: number
  active: boolean
  sort_order: number
}

type BarberRow = {
  id: string
  name: string
  chair_number: number
  avatar_url: string | null
  active: boolean
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
  status: Appointment["status"]
  price_paid_cents: number | null
  notes: string | null
  is_walk_in: boolean
  payment_method: Appointment["paymentMethod"]
  completed_at: string | null
  created_at: string
}

type ReviewRow = {
  id: string
  appointment_id: string
  barber_id: string
  rating: number
  comment: string | null
  created_at: string
}

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    barberId: row.barber_id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
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

function mapBarber(row: BarberRow): Barber {
  return {
    id: row.id,
    name: row.name,
    chairNumber: row.chair_number,
    avatarUrl: row.avatar_url,
    active: row.active,
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

class SupabaseBookingRepository implements BookingRepository {
  readonly mode = "supabase" as const

  private get client() {
    if (!supabase) throw new Error("Supabase não está configurado")
    return supabase
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

  async listBarbers(): Promise<Barber[]> {
    // Public-safe view: no pin_hash/pin_salt/commission columns exposed.
    const { data, error } = await this.client.from("barbers_public").select("*").eq("active", true)
    if (error) throw error
    return (data as BarberRow[]).map(mapBarber)
  }

  async getAvailableSlots(params: {
    barberId: string
    date: string
    serviceDurationMinutes: number
  }): Promise<TimeSlot[]> {
    const { barberId, date, serviceDurationMinutes } = params
    const dayOfWeek = new Date(`${date}T00:00:00`).getDay()

    const { data: hoursRows, error: hoursError } = await this.client
      .from("business_hours")
      .select("*")
      .eq("day_of_week", dayOfWeek)
      .or(`barber_id.eq.${barberId},barber_id.is.null`)
    if (hoursError) throw hoursError

    const hours =
      hoursRows?.find((h) => h.barber_id === barberId) ?? hoursRows?.find((h) => h.barber_id === null)
    if (!hours) return []

    // Public-safe view: only slot timing, no client name/phone exposed.
    const { data: appointmentRows, error: apptError } = await this.client
      .from("appointment_slots")
      .select("start_time, end_time")
      .eq("barber_id", barberId)
      .eq("date", date)
    if (apptError) throw apptError

    const { data: blockedRows, error: blockedError } = await this.client
      .from("blocked_slots")
      .select("start_time, end_time")
      .eq("barber_id", barberId)
      .eq("date", date)
    if (blockedError) throw blockedError

    const busyIntervals = [
      ...(appointmentRows ?? []).map((a) => ({
        start: timeToMinutes(a.start_time.slice(0, 5)),
        end: timeToMinutes(a.end_time.slice(0, 5)),
      })),
      ...(blockedRows ?? []).map((b) => ({
        start: timeToMinutes(b.start_time.slice(0, 5)),
        end: timeToMinutes(b.end_time.slice(0, 5)),
      })),
      ...(hours.lunch_start && hours.lunch_end
        ? [
            {
              start: timeToMinutes(hours.lunch_start.slice(0, 5)),
              end: timeToMinutes(hours.lunch_end.slice(0, 5)),
            },
          ]
        : []),
    ]

    const openMinutes = timeToMinutes(hours.open_time.slice(0, 5))
    const closeMinutes = timeToMinutes(hours.close_time.slice(0, 5))
    const granularity = hours.slot_granularity_minutes

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
    // A plain table insert can't also read the row back for an
    // unauthenticated client (appointments has no public SELECT policy, by
    // design, to keep other clients' names/phones private) — PostgREST's
    // RETURNING then fails as a row-level-security violation on the whole
    // request. This RPC inserts and returns just the one row it created.
    const { data, error } = await this.client.rpc("create_public_appointment", {
      p_barber_id: input.barberId,
      p_service_id: input.serviceId,
      p_date: input.date,
      p_start_time: input.startTime,
      p_client_name: input.clientName,
      p_client_phone: normalizePhone(input.clientPhone),
    })
    if (error) throw error

    return mapAppointment(data as AppointmentRow)
  }

  async getAppointmentsByPhone(phone: string): Promise<Appointment[]> {
    // Scoped RPC (not a table SELECT): returns only this phone's own
    // appointments, so no other client's name/phone can ever leak.
    const { data, error } = await this.client.rpc("get_appointments_by_phone", {
      p_phone: normalizePhone(phone),
    })
    if (error) throw error
    return (data as AppointmentRow[])
      .map(mapAppointment)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
  }

  async cancelAppointment(appointmentId: string, phone: string): Promise<void> {
    // Requires the phone to match server-side, so a guessed/leaked UUID
    // alone can't be used to cancel someone else's appointment.
    const { error } = await this.client.rpc("cancel_own_appointment", {
      p_appointment_id: appointmentId,
      p_phone: normalizePhone(phone),
    })
    if (error) throw error
  }

  async getOpenWeekdays(): Promise<number[]> {
    const { data, error } = await this.client
      .from("business_hours")
      .select("day_of_week")
      .is("barber_id", null)
    if (error) throw error
    const days = new Set((data as { day_of_week: number }[]).map((r) => r.day_of_week))
    return [...days].sort((a, b) => a - b)
  }

  async submitReview(input: {
    appointmentId: string
    barberId: string
    clientPhone: string
    rating: number
    comment: string | null
  }): Promise<void> {
    // Ownership (appointment belongs to this phone, and is completed) is
    // verified server-side by the RPC — not a bare table insert.
    const { error } = await this.client.rpc("submit_review", {
      p_appointment_id: input.appointmentId,
      p_phone: normalizePhone(input.clientPhone),
      p_rating: input.rating,
      p_comment: input.comment,
    })
    if (error) throw error
  }

  async getReviews(appointmentIds: string[], phone: string): Promise<Review[]> {
    if (appointmentIds.length === 0) return []
    // Scoped RPC by phone (reviews table SELECT is staff-only now).
    const { data, error } = await this.client.rpc("get_reviews_by_phone", {
      p_phone: normalizePhone(phone),
    })
    if (error) throw error
    return (data as ReviewRow[])
      .filter((r) => appointmentIds.includes(r.appointment_id))
      .map(mapReview)
  }
}

export const supabaseBookingRepository = new SupabaseBookingRepository()
