import { supabase } from "@/lib/supabaseClient"
import type { Appointment, Barber, Service, TimeSlot } from "@/lib/types"
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
    const { data, error } = await this.client.from("barbers").select("*").eq("active", true)
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

    const { data: appointmentRows, error: apptError } = await this.client
      .from("appointments")
      .select("start_time, end_time")
      .eq("barber_id", barberId)
      .eq("date", date)
      .neq("status", "cancelled")
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
    const { data: serviceRow, error: serviceError } = await this.client
      .from("services")
      .select("duration_minutes")
      .eq("id", input.serviceId)
      .single()
    if (serviceError) throw serviceError

    const endTime = minutesToTime(timeToMinutes(input.startTime) + serviceRow.duration_minutes)

    const { data, error } = await this.client
      .from("appointments")
      .insert({
        barber_id: input.barberId,
        service_id: input.serviceId,
        client_name: input.clientName,
        client_phone: normalizePhone(input.clientPhone),
        date: input.date,
        start_time: input.startTime,
        end_time: endTime,
        status: "scheduled",
      })
      .select("*")
      .single()
    if (error) throw error

    return mapAppointment(data as AppointmentRow)
  }

  async getAppointmentsByPhone(phone: string): Promise<Appointment[]> {
    const { data, error } = await this.client
      .from("appointments")
      .select("*")
      .eq("client_phone", normalizePhone(phone))
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })
    if (error) throw error
    return (data as AppointmentRow[]).map(mapAppointment)
  }

  async cancelAppointment(appointmentId: string): Promise<void> {
    const { error } = await this.client
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointmentId)
    if (error) throw error
  }
}

export const supabaseBookingRepository = new SupabaseBookingRepository()
