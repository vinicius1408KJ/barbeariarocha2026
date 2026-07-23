import type { Appointment, Barber, Review, Service, TimeSlot } from "@/lib/types"

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
  // Post-service ratings
  submitReview(input: {
    appointmentId: string
    barberId: string
    rating: number
    comment: string | null
  }): Promise<void>
  getReviews(appointmentIds: string[]): Promise<Review[]>
}
