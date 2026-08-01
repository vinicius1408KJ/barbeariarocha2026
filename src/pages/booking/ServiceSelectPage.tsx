import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { Calendar, CheckCircle2, LayoutGrid, List, Search } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { ServiceCard, ServiceGridCard } from "@/components/booking/ServiceCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn, formatDurationShort, formatPriceBRL } from "@/lib/utils"
import { cartTotals, useBookingFlow } from "@/hooks/useBookingFlow"
import { useServices } from "@/hooks/useServices"
import type { Service } from "@/lib/types"

type ViewMode = "list" | "grid"

export function ServiceSelectPage() {
  const { services, isLoading } = useServices()
  const { state, dispatch } = useBookingFlow()
  const navigate = useNavigate()
  const [view, setView] = useState<ViewMode>("list")
  const [justAdded, setJustAdded] = useState<Service | null>(null)
  const [addedDialogOpen, setAddedDialogOpen] = useState(false)

  const { cart } = state
  const totals = cartTotals(cart)

  function handleToggle(service: Service) {
    const inCart = cart.some((s) => s.id === service.id)
    if (inCart) {
      dispatch({ type: "REMOVE_SERVICE", serviceId: service.id })
      return
    }
    dispatch({ type: "ADD_SERVICE", service })
    setJustAdded(service)
    setAddedDialogOpen(true)
  }

  function handleContinue() {
    setAddedDialogOpen(false)
    navigate("/agendar/barbeiro")
  }

  const addedTotals = justAdded ? cartTotals([...cart.filter((s) => s.id !== justAdded.id), justAdded]) : totals

  return (
    <div className="min-h-svh pb-24">
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
              <ServiceGridCard
                key={service.id}
                service={service}
                isSelected={cart.some((s) => s.id === service.id)}
                onToggle={() => handleToggle(service)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                isSelected={cart.some((s) => s.id === service.id)}
                onToggle={() => handleToggle(service)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm"
          >
            <div className="mx-auto flex max-w-lg items-center gap-4 px-6 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {cart.length} {cart.length === 1 ? "serviço" : "serviços"} · {formatDurationShort(totals.durationMinutes)}
                </p>
                <p className="text-sm font-semibold text-primary">{formatPriceBRL(totals.priceCents)}</p>
              </div>
              <Button size="lg" onClick={handleContinue} className="h-11 shrink-0 px-6 text-sm">
                Continuar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={addedDialogOpen} onOpenChange={setAddedDialogOpen}>
        <DialogContent>
          {justAdded && (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <CheckCircle2 className="size-6" />
              </span>
              <div>
                <p className="font-semibold text-foreground">{justAdded.name} adicionado</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cart.length} {cart.length === 1 ? "serviço" : "serviços"} ·{" "}
                  {formatDurationShort(addedTotals.durationMinutes)} ·{" "}
                  {formatPriceBRL(addedTotals.priceCents)}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2">
                <Button onClick={handleContinue} className="h-11 w-full text-sm">
                  Continuar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAddedDialogOpen(false)}
                  className="h-11 w-full text-sm"
                >
                  Adicionar outro serviço
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
