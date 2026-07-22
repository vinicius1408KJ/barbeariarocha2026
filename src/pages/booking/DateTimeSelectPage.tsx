import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { addDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Scissors } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { TimeSlotGrid } from "@/components/booking/TimeSlotGrid"
import { Button } from "@/components/ui/button"
import { useBookingFlow } from "@/hooks/useBookingFlow"
import { useAvailableSlots } from "@/hooks/useAvailableSlots"
import { formatPriceBRL } from "@/lib/utils"

function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd")
}

export function DateTimeSelectPage() {
  const { state, dispatch } = useBookingFlow()
  const navigate = useNavigate()
  const [date, setDate] = useState(state.date ?? todayISO())
  const [selectedTime, setSelectedTime] = useState<string | null>(state.time)

  const { slots, isLoading } = useAvailableSlots({
    barberId: state.barber?.id ?? null,
    date,
    serviceDurationMinutes: state.service?.durationMinutes ?? null,
  })

  function handleDateChange(value: string) {
    if (value < todayISO()) return
    setDate(value)
    setSelectedTime(null)
  }

  function shiftDate(days: number) {
    const next = format(addDays(new Date(`${date}T00:00:00`), days), "yyyy-MM-dd")
    handleDateChange(next)
  }

  function handleContinue() {
    if (!selectedTime) return
    dispatch({ type: "SELECT_DATETIME", date, time: selectedTime })
    navigate("/agendar/contato")
  }

  const dateObj = new Date(`${date}T00:00:00`)
  const displayDate = format(dateObj, "dd/MM/yyyy", { locale: ptBR })
  const weekday = format(dateObj, "EEEE", { locale: ptBR })
  const displayWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  const isPastDisabled = date <= todayISO()

  return (
    <div className="min-h-svh">
      <PageHeader backTo="/agendar/barbeiro" backLabel="Voltar" />

      <div className="mx-auto max-w-lg px-6 py-6">
        {state.service && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Scissors className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{state.service.name}</p>
              <p className="text-xs font-medium text-muted-foreground">
                {state.service.durationMinutes} min
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-primary">
              {formatPriceBRL(state.service.priceCents)}
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-card p-2">
          <button
            type="button"
            disabled={isPastDisabled}
            onClick={() => shiftDate(-1)}
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="relative text-center">
            <input
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => handleDateChange(e.target.value)}
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
            />
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
              {displayWeekday}
            </p>
            <p className="text-xl font-semibold tracking-tight text-foreground">{displayDate}</p>
          </div>

          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground active:scale-95"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <p className="mt-6 mb-2 text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
          Horários disponíveis
        </p>
        <TimeSlotGrid
          slots={slots}
          selectedTime={selectedTime}
          onSelect={setSelectedTime}
          isLoading={isLoading}
        />

        <AnimatePresence>
          {selectedTime && (
            <motion.div
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 8, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/[0.07] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    Horário selecionado
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">
                    {displayWeekday}, {displayDate} às {selectedTime}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTime(null)}
                  className="shrink-0 text-xs font-semibold tracking-wide text-primary uppercase transition-colors hover:text-primary/80"
                >
                  Alterar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          size="lg"
          disabled={!selectedTime}
          onClick={handleContinue}
          className="mt-6 h-12 w-full text-sm shadow-lg shadow-primary/15 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/20 active:translate-y-0"
        >
          Continuar
        </Button>
      </div>
    </div>
  )
}
