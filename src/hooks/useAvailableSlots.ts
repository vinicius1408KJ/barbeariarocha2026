import { useEffect, useState } from "react"
import { useRepository } from "@/lib/repository/RepositoryContext"
import type { TimeSlot } from "@/lib/types"

export function useAvailableSlots(params: {
  barberId: string | null
  date: string | null
  serviceDurationMinutes: number | null
}) {
  const { repository, isResolving } = useRepository()
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { barberId, date, serviceDurationMinutes } = params

  useEffect(() => {
    if (isResolving || !barberId || !date || !serviceDurationMinutes) return
    let cancelled = false
    setIsLoading(true)
    repository
      .getAvailableSlots({ barberId, date, serviceDurationMinutes })
      .then((data) => {
        if (!cancelled) {
          setSlots(data)
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [repository, isResolving, barberId, date, serviceDurationMinutes])

  return { slots, isLoading: isLoading || isResolving }
}
