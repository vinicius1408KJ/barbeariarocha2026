import { useNavigate } from "react-router-dom"
import { Calendar, Search } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { ServiceCard } from "@/components/booking/ServiceCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useBookingFlow } from "@/hooks/useBookingFlow"
import { useServices } from "@/hooks/useServices"
import type { Service } from "@/lib/types"

export function ServiceSelectPage() {
  const { services, isLoading } = useServices()
  const { dispatch } = useBookingFlow()
  const navigate = useNavigate()

  function handleSelect(service: Service) {
    dispatch({ type: "SELECT_SERVICE", service })
    navigate("/agendar/barbeiro")
  }

  return (
    <div className="min-h-svh">
      <PageHeader backTo="/" backLabel="Início" />

      <div className="mx-auto max-w-lg px-6 py-8">
        <div className="mb-6 flex items-center justify-center gap-1 rounded-xl bg-card p-1">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-semibold tracking-wide text-primary-foreground uppercase"
          >
            <Calendar className="size-3.5" />
            Novo
          </button>
          <button
            type="button"
            onClick={() => navigate("/meus-horarios")}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            <Search className="size-3.5" />
            Meus Horários
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[68px] rounded-xl" />)
            : services.map((service) => (
                <ServiceCard key={service.id} service={service} onSelect={() => handleSelect(service)} />
              ))}
        </div>
      </div>
    </div>
  )
}
