import { useEffect, useState } from "react"
import { useRepository } from "@/lib/repository/RepositoryContext"
import type { Service } from "@/lib/types"

export function useServices() {
  const { repository, isResolving } = useRepository()
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isResolving) return
    let cancelled = false
    setIsLoading(true)
    repository.listServices().then((data) => {
      if (!cancelled) {
        setServices(data)
        setIsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [repository, isResolving])

  return { services, isLoading: isLoading || isResolving }
}
