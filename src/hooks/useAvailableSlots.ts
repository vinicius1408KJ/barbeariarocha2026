import { useEffect, useState } from "react"
import { useRepository } from "@/lib/repository/RepositoryContext"
import type { TimeSlot } from "@/lib/types"

// This list was fetched once and never refreshed while the client sat on the
// screen deciding — so a slot someone else booked seconds after page load
// kept showing as free until a manual reload. Poll while the tab stays open
// and refetch immediately when it regains focus, so a stale "available"
// mostly self-corrects before the client even taps it (the server-side
// conflict check is still the real guard against a genuine double-book).
const REFRESH_INTERVAL_MS = 20_000

export function useAvailableSlots(params: {
  barberId: string | null
  date: string | null
  totalDurationMinutes: number | null
}) {
  const { repository, isResolving } = useRepository()
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { barberId, date, totalDurationMinutes } = params

  useEffect(() => {
    if (isResolving || !barberId || !date || !totalDurationMinutes) return
    let cancelled = false

    function fetchSlots(showLoading: boolean) {
      if (showLoading) setIsLoading(true)
      repository
        .getAvailableSlots({ barberId: barberId!, date: date!, totalDurationMinutes: totalDurationMinutes! })
        .then((data) => {
          if (!cancelled) {
            setSlots(data)
            setIsLoading(false)
          }
        })
    }

    fetchSlots(true)
    const interval = setInterval(() => fetchSlots(false), REFRESH_INTERVAL_MS)

    function onVisible() {
      if (document.visibilityState === "visible") fetchSlots(false)
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [repository, isResolving, barberId, date, totalDurationMinutes])

  return { slots, isLoading: isLoading || isResolving }
}
