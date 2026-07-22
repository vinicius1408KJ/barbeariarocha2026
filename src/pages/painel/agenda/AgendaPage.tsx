import { useCallback, useEffect, useState } from "react"
import { addDays, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Lock, Plus, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { adminRepository } from "@/lib/repository/adminRepository"
import { useStaffSession } from "@/lib/auth/StaffSessionContext"
import { STATUS_LABEL, STATUS_PILL } from "@/lib/statusLabels"
import { formatPriceBRL } from "@/lib/utils"
import type { Appointment, BlockedSlot, Service, WalkInEntry } from "@/lib/types"
import { toast } from "sonner"
import { AppointmentDetailDialog } from "./AppointmentDetailDialog"
import { WalkInDialog } from "./WalkInDialog"
import { WalkInCompleteDialog } from "./WalkInCompleteDialog"
import { BlockTimeDialog } from "./BlockTimeDialog"

function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd")
}

export function AgendaPage() {
  const { session } = useStaffSession()
  const barberId = session!.barberId

  const [date, setDate] = useState(todayISO())
  const [services, setServices] = useState<Service[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [blocks, setBlocks] = useState<BlockedSlot[]>([])
  const [queue, setQueue] = useState<WalkInEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState<Appointment | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [walkInOpen, setWalkInOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [completeWalkIn, setCompleteWalkIn] = useState<WalkInEntry | null>(null)
  const [completeWalkInOpen, setCompleteWalkInOpen] = useState(false)

  useEffect(() => {
    adminRepository.listServices().then(setServices).catch(() => setServices([]))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [appts, blks, q] = await Promise.all([
        adminRepository.listAppointmentsForBarber(barberId, date),
        adminRepository.listBlockedSlots(barberId, date),
        adminRepository.listWalkInQueue(barberId),
      ])
      setAppointments(appts)
      setBlocks(blks)
      setQueue(q)
    } finally {
      setLoading(false)
    }
  }, [barberId, date])

  useEffect(() => {
    load()
  }, [load])

  function shiftDate(days: number) {
    setDate(format(addDays(new Date(`${date}T00:00:00`), days), "yyyy-MM-dd"))
  }

  const dateObj = new Date(`${date}T00:00:00`)
  const weekday = format(dateObj, "EEEE", { locale: ptBR })
  const displayWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  const displayDate = format(dateObj, "dd/MM/yyyy", { locale: ptBR })

  const revenueCents = appointments
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + (a.pricePaidCents ?? 0), 0)
  const completedCount = appointments.filter((a) => a.status === "completed").length

  const serviceOf = (id: string) => services.find((s) => s.id === id)

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      {/* Date nav */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-2">
        <button
          type="button"
          onClick={() => shiftDate(-1)}
          className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground active:scale-95"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="relative text-center">
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
          />
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground">{displayWeekday}</p>
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

      {/* Daily revenue summary */}
      <div className="mt-4 flex items-center justify-between rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Faturamento do dia
          </p>
          <p className="text-2xl font-semibold text-primary">{formatPriceBRL(revenueCents)}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {completedCount} {completedCount === 1 ? "atendimento" : "atendimentos"}
        </p>
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setWalkInOpen(true)} className="h-10">
          <Plus className="size-4" />
          Walk-in
        </Button>
        <Button variant="outline" onClick={() => setBlockOpen(true)} className="h-10">
          <Lock className="size-4" />
          Bloquear
        </Button>
      </div>

      {/* Walk-in queue */}
      {queue.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
            <Users className="size-3.5" />
            Fila ({queue.length})
          </p>
          <div className="flex flex-col gap-2">
            {queue.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/[0.05] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{w.clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.serviceId ? serviceOf(w.serviceId)?.name : "Sem serviço definido"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {w.status === "waiting" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        adminRepository
                          .updateWalkInStatus(w.id, "in_progress")
                          .then(load)
                          .catch(() => toast.error("Não foi possível iniciar."))
                      }
                    >
                      Iniciar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      setCompleteWalkIn(w)
                      setCompleteWalkInOpen(true)
                    }}
                  >
                    Concluir
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() =>
                      adminRepository
                        .updateWalkInStatus(w.id, "left")
                        .then(load)
                        .catch(() => toast.error("Não foi possível remover."))
                    }
                  >
                    Saiu
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <p className="mt-6 mb-2 text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
        Agenda
      </p>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : appointments.length === 0 && blocks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Nenhum agendamento para este dia.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {appointments.map((a) => {
            const service = serviceOf(a.serviceId)
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setSelected(a)
                  setDetailOpen(true)
                }}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <span className="w-12 shrink-0 text-sm font-semibold text-foreground">
                  {a.startTime}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{a.clientName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {service?.name}
                    {a.isWalkIn && " · Walk-in"}
                  </p>
                </div>
                <span
                  className={
                    "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold " +
                    STATUS_PILL[a.status]
                  }
                >
                  {STATUS_LABEL[a.status]}
                </span>
              </button>
            )
          })}

          {blocks.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-4 rounded-xl border border-border/60 bg-transparent px-4 py-3"
            >
              <span className="w-12 shrink-0 text-sm font-semibold text-muted-foreground">
                {b.startTime}
              </span>
              <div className="flex min-w-0 flex-1 items-center gap-2 text-muted-foreground">
                <Lock className="size-3.5" />
                <span className="truncate text-sm">{b.reason ?? "Bloqueado"}</span>
                <span className="text-xs text-muted-foreground/60">
                  {b.startTime}–{b.endTime}
                </span>
              </div>
              <button
                type="button"
                onClick={() => adminRepository.unblockSlot(b.id).then(load)}
                className="shrink-0 text-xs font-semibold tracking-wide text-primary uppercase hover:text-primary/80"
              >
                Liberar
              </button>
            </div>
          ))}
        </div>
      )}

      <AppointmentDetailDialog
        appointment={selected}
        service={selected ? serviceOf(selected.serviceId) : undefined}
        barberName={session!.barberName}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onChanged={load}
      />
      <WalkInDialog
        barberId={barberId}
        services={services}
        open={walkInOpen}
        onOpenChange={setWalkInOpen}
        onCreated={load}
      />
      <WalkInCompleteDialog
        walkIn={completeWalkIn}
        services={services}
        open={completeWalkInOpen}
        onOpenChange={setCompleteWalkInOpen}
        onDone={load}
      />
      <BlockTimeDialog
        barberId={barberId}
        date={date}
        open={blockOpen}
        onOpenChange={setBlockOpen}
        onBlocked={load}
      />
    </div>
  )
}
