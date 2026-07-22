import { createContext, useContext } from "react"
import type { Barber, Service } from "@/lib/types"

export type BookingState = {
  service: Service | null
  barber: Barber | null
  date: string | null
  time: string | null
  clientName: string
  clientPhone: string
}

export type BookingAction =
  | { type: "SELECT_SERVICE"; service: Service }
  | { type: "SELECT_BARBER"; barber: Barber }
  | { type: "SELECT_DATETIME"; date: string; time: string }
  | { type: "SET_CONTACT"; name: string; phone: string }
  | { type: "RESET" }

export const initialBookingState: BookingState = {
  service: null,
  barber: null,
  date: null,
  time: null,
  clientName: "",
  clientPhone: "",
}

export function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case "SELECT_SERVICE":
      return { ...state, service: action.service }
    case "SELECT_BARBER":
      return { ...state, barber: action.barber }
    case "SELECT_DATETIME":
      return { ...state, date: action.date, time: action.time }
    case "SET_CONTACT":
      return { ...state, clientName: action.name, clientPhone: action.phone }
    case "RESET":
      return initialBookingState
    default:
      return state
  }
}

export const BOOKING_SESSION_KEY = "br_booking_session"

type BookingContextValue = {
  state: BookingState
  dispatch: React.Dispatch<BookingAction>
}

export const BookingContext = createContext<BookingContextValue | null>(null)

export function useBookingFlow(): BookingContextValue {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error("useBookingFlow deve ser usado dentro de BookingLayout")
  return ctx
}
