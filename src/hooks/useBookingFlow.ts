import { createContext, useContext } from "react"
import type { Barber, Service } from "@/lib/types"

export type BookingState = {
  cart: Service[]
  barber: Barber | null
  date: string | null
  time: string | null
  clientName: string
  clientPhone: string
}

export type BookingAction =
  | { type: "ADD_SERVICE"; service: Service }
  | { type: "REMOVE_SERVICE"; serviceId: string }
  | { type: "CLEAR_CART" }
  | { type: "SELECT_BARBER"; barber: Barber }
  | { type: "SELECT_DATETIME"; date: string; time: string }
  | { type: "SET_CONTACT"; name: string; phone: string }
  | { type: "RESET" }

export const initialBookingState: BookingState = {
  cart: [],
  barber: null,
  date: null,
  time: null,
  clientName: "",
  clientPhone: "",
}

export function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case "ADD_SERVICE":
      if (state.cart.some((s) => s.id === action.service.id)) return state
      return { ...state, cart: [...state.cart, action.service] }
    case "REMOVE_SERVICE":
      return { ...state, cart: state.cart.filter((s) => s.id !== action.serviceId) }
    case "CLEAR_CART":
      return { ...state, cart: [] }
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

export function cartTotals(cart: Service[]): { durationMinutes: number; priceCents: number } {
  return cart.reduce(
    (acc, s) => ({
      durationMinutes: acc.durationMinutes + s.durationMinutes,
      priceCents: acc.priceCents + s.priceCents,
    }),
    { durationMinutes: 0, priceCents: 0 }
  )
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
