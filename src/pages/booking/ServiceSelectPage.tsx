import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Calendar, LayoutGrid, List, Search } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { ServiceCard, ServiceGridCard } from "@/components/booking/ServiceCard"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useBookingFlow } from "@/hooks/useBookingFlow"
import { useServices } from "@/hooks/useServices"
import type { Service } from "@/lib/types"

type ViewMode = "list" | "grid"

export function ServiceSelectPage() {
  const { services, isLoading } = useServices()
  const { dispatch } = useBookingFlow()
  const navigate = useNavigate()
  const [view, setView] = useState<ViewMode>("list")

  function handleSelect(service: Service) {
    dispatch({ type: "SELECT_SERVICE", service })
    navigate("/agendar/barbeiro")
  }

  return (
    <div className="min-h-svh">
      <PageHeader backTo="/" backLabel="Início" />

      <div className="mx-auto max-w-lg px-6 py-8">
        <div className="mb-4 flex items-center justify-center gap-1 rounded-xl bg-card p-1">
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

        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Serviços
          </p>
          <div className="flex items-center gap-1 rounded-lg bg-card p-1">
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="Ver em lista"
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-colors",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Ver em grade"
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-colors",
                view === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-3.5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className={view === "grid" ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={view === "grid" ? "h-24 rounded-xl" : "h-[68px] rounded-xl"} />
            ))}
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3">
            {services.map((service) => (
              <ServiceGridCard key={service.id} service={service} onSelect={() => handleSelect(service)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} onSelect={() => handleSelect(service)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
