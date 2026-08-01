import type { Appointment, Barber, Review, Service, TimeSlot } from "@/lib/types"

export interface BookingRepository {
  readonly mode: "supabase" | "local"
  listServices(): Promise<Service[]>
  listBarbers(): Promise<Barber[]>
  getAvailableSlots(params: {
    barberId: string
    date: string
    totalDurationMinutes: number
  }): Promise<TimeSlot[]>
  createAppointment(input: {
    barberId: string
    services: Service[]
    date: string
    startTime: string
    clientName: string
    clientPhone: string
  }): Promise<Appointment>
  getAppointmentsByPhone(phone: string): Promise<Appointment[]>
  // Requires the phone to match server-side, so a leaked/guessed id alone
  // can't be used to cancel someone else's appointment.
  cancelAppointment(appointmentId: string, phone: string): Promise<void>
  // Weekdays (0=Sun..6=Sat) the shop is open on.
  getOpenWeekdays(): Promise<number[]>
  // Post-service ratings — scoped by phone server-side (see submit_review RPC)
  submitReview(input: {
    appointmentId: string
    barberId: string
    clientPhone: string
    rating: number
    comment: string | null
  }): Promise<void>
  getReviews(appointmentIds: string[], phone: string): Promise<Review[]>
}
