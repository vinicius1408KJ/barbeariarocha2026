import { useEffect, useReducer } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Navigate, useLocation, useOutlet } from "react-router-dom"
import {
  BOOKING_SESSION_KEY,
  BookingContext,
  bookingReducer,
  initialBookingState,
  type BookingState,
} from "@/hooks/useBookingFlow"

function loadInitialState(): BookingState {
  try {
    const raw = sessionStorage.getItem(BOOKING_SESSION_KEY)
    if (!raw) return initialBookingState
    return { ...initialBookingState, ...JSON.parse(raw) }
  } catch {
    return initialBookingState
  }
}

const STEP_ORDER = [
  "/agendar/servico",
  "/agendar/barbeiro",
  "/agendar/horario",
  "/agendar/contato",
  "/agendar/confirmado",
]

function requiredStateForStep(path: string, state: BookingState): boolean {
  const index = STEP_ORDER.indexOf(path)
  if (index <= 0) return true
  if (index >= 1 && !state.service) return false
  if (index >= 2 && !state.barber) return false
  if (index >= 3 && (!state.date || !state.time)) return false
  return true
}

export function BookingLayout() {
  const [state, dispatch] = useReducer(bookingReducer, undefined, loadInitialState)
  const location = useLocation()
  const element = useOutlet()

  useEffect(() => {
    sessionStorage.setItem(BOOKING_SESSION_KEY, JSON.stringify(state))
  }, [state])

  if (!requiredStateForStep(location.pathname, state)) {
    if (!state.service) return <Navigate to="/agendar/servico" replace />
    if (!state.barber) return <Navigate to="/agendar/barbeiro" replace />
    return <Navigate to="/agendar/horario" replace />
  }

  return (
    <BookingContext.Provider value={{ state, dispatch }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {element}
        </motion.div>
      </AnimatePresence>
    </BookingContext.Provider>
  )
}
