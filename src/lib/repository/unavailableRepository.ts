import type { BookingRepository } from "./types"

// Used in production when the database can't be reached. Every call
// rejects instead of quietly serving seed data / writing to localStorage —
// the previous fallback made the booking site show fictional services and
// confirm appointments that never reached the barber's panel.
//
// These reject (rather than throw synchronously) so callers can handle the
// failure in their existing promise chains instead of blowing up render.
export const UNAVAILABLE_MESSAGE =
  "Sem conexão com o servidor. Verifique sua internet e tente novamente."

function unreachable(): Promise<never> {
  return Promise.reject(new Error(UNAVAILABLE_MESSAGE))
}

export const unavailableBookingRepository: BookingRepository = {
  mode: "supabase",
  listServices: unreachable,
  listBarbers: unreachable,
  getAvailableSlots: unreachable,
  createAppointment: unreachable,
  getAppointmentsByPhone: unreachable,
  cancelAppointment: unreachable,
  getOpenWeekdays: unreachable,
  submitReview: unreachable,
  getReviews: unreachable,
}
