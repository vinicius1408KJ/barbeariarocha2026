import { useEffect, useState } from "react"
import { useRepository } from "@/lib/repository/RepositoryContext"
import type { TimeSlot } from "@/lib/types"

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
    setIsLoading(true)
    repository
      .getAvailableSlots({ barberId, date, totalDurationMinutes })
      .then((data) => {
        if (!cancelled) {
          setSlots(data)
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [repository, isResolving, barberId, date, totalDurationMinutes])

  return { slots, isLoading: isLoading || isResolving }
}
