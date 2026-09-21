import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { unavailableBookingRepository } from "./unavailableRepository"
import { resolveRepository } from "./index"
import type { BookingRepository } from "./types"

type RepositoryContextValue = {
  repository: BookingRepository
  isResolving: boolean
  // True when the database couldn't be reached in production. The booking
  // flow must refuse to take a booking in this state rather than write it
  // to localStorage and show a confirmation the barber will never see.
  isUnavailable: boolean
}

const RepositoryContext = createContext<RepositoryContextValue | null>(null)

export function RepositoryProvider({ children }: { children: ReactNode }) {
  // Starts unavailable rather than local: nothing should read or write
  // anything until resolveRepository says which backend is actually live
  // (isResolving gates the screens until then anyway).
  const [repository, setRepository] = useState<BookingRepository>(unavailableBookingRepository)
  const [isResolving, setIsResolving] = useState(true)
  const [isUnavailable, setIsUnavailable] = useState(false)

  useEffect(() => {
    let cancelled = false
    resolveRepository().then((resolved) => {
      if (cancelled) return
      if (resolved) {
        setRepository(resolved)
        setIsUnavailable(false)
      } else {
        // Swap in the failing repository so no screen can quietly render
        // seed data or accept a booking into localStorage.
        setRepository(unavailableBookingRepository)
        setIsUnavailable(true)
      }
      setIsResolving(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <RepositoryContext.Provider value={{ repository, isResolving, isUnavailable }}>
      {children}
    </RepositoryContext.Provider>
  )
}

export function useRepository(): RepositoryContextValue {
  const ctx = useContext(RepositoryContext)
  if (!ctx) throw new Error("useRepository deve ser usado dentro de RepositoryProvider")
  return ctx
}
