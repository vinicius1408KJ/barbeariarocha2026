import { useEffect, useState } from "react"
import { useRepository } from "@/lib/repository/RepositoryContext"
import type { Barber } from "@/lib/types"

export function useBarbers() {
  const { repository, isResolving } = useRepository()
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isResolving) return
    let cancelled = false
    setIsLoading(true)
    repository
      .listBarbers()
      .then((data) => {
        if (!cancelled) setBarbers(data)
      })
      .catch(() => {
        if (!cancelled) setBarbers([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [repository, isResolving])

  return { barbers, isLoading: isLoading || isResolving }
}
