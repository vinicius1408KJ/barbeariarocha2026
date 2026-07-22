import type { Appointment, Barber, Service, TimeSlot } from "@/lib/types"

export interface BookingRepository {
  readonly mode: "supabase" | "local"
  listServices(): Promise<Service[]>
  listBarbers(): Promise<Barber[]>
  getAvailableSlots(params: {
    barberId: string
    date: string
    serviceDurationMinutes: number
  }): Promise<TimeSlot[]>
  createAppointment(input: {
    barberId: string
    serviceId: string
    date: string
    startTime: string
    clientName: string
    clientPhone: string
  }): Promise<Appointment>
  getAppointmentsByPhone(phone: string): Promise<Appointment[]>
  cancelAppointment(appointmentId: string): Promise<void>
}
