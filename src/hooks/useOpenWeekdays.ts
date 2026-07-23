import { useEffect, useState } from "react"
import { useRepository } from "@/lib/repository/RepositoryContext"

export function useOpenWeekdays() {
  const { repository, isResolving } = useRepository()
  const [openWeekdays, setOpenWeekdays] = useState<number[] | null>(null)

  useEffect(() => {
    if (isResolving) return
    let cancelled = false
    repository.getOpenWeekdays().then((days) => {
      if (!cancelled) setOpenWeekdays(days)
    })
    return () => {
      cancelled = true
    }
  }, [repository, isResolving])

  return { openWeekdays, isLoading: openWeekdays === null || isResolving }
}
