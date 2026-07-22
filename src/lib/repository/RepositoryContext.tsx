import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { localBookingRepository } from "./localRepository"
import { resolveRepository } from "./index"
import type { BookingRepository } from "./types"

type RepositoryContextValue = {
  repository: BookingRepository
  isResolving: boolean
}

const RepositoryContext = createContext<RepositoryContextValue | null>(null)

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const [repository, setRepository] = useState<BookingRepository>(localBookingRepository)
  const [isResolving, setIsResolving] = useState(true)

  useEffect(() => {
    let cancelled = false
    resolveRepository().then((resolved) => {
      if (!cancelled) {
        setRepository(resolved)
        setIsResolving(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <RepositoryContext.Provider value={{ repository, isResolving }}>
      {children}
    </RepositoryContext.Provider>
  )
}

export function useRepository(): RepositoryContextValue {
  const ctx = useContext(RepositoryContext)
  if (!ctx) throw new Error("useRepository deve ser usado dentro de RepositoryProvider")
  return ctx
}
