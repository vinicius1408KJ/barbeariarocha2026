import { useCallback, useEffect, useState } from "react"
import { Coffee, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { adminRepository } from "@/lib/repository/adminRepository"

const DAY_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
]

const DEFAULT_GRANULARITY = 15

type DayState = {
  dayOfWeek: number
  open: boolean
  openTime: string
  closeTime: string
  granularity: number
  hasLunch: boolean
  lunchStart: string
  lunchEnd: string
}

function emptyWeek(): DayState[] {
  return DAY_LABELS.map((_, i) => ({
    dayOfWeek: i,
    open: false,
    openTime: "09:00",
    closeTime: "19:00",
    granularity: DEFAULT_GRANULARITY,
    hasLunch: false,
    lunchStart: "12:00",
    lunchEnd: "13:00",
  }))
}

export function BusinessHoursSection() {
  const [week, setWeek] = useState<DayState[] | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const hours = await adminRepository.listBusinessHours()
      const base = emptyWeek()
      for (const h of hours) {
        base[h.dayOfWeek] = {
          dayOfWeek: h.dayOfWeek,
          open: true,
          openTime: h.openTime,
          closeTime: h.closeTime,
          granularity: h.slotGranularityMinutes || DEFAULT_GRANULARITY,
          hasLunch: Boolean(h.lunchStart && h.lunchEnd),
          lunchStart: h.lunchStart ?? "12:00",
          lunchEnd: h.lunchEnd ?? "13:00",
        }
      }
      setWeek(base)
    } catch {
      setWeek(emptyWeek())
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function patchDay(dayOfWeek: number, patch: Partial<DayState>) {
    setWeek((prev) =>
      prev ? prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)) : prev
    )
  }

  async function save() {
    if (!week) return
    const openDays = week.filter((d) => d.open)
    for (const d of openDays) {
      if (d.closeTime <= d.openTime) {
        toast.error(`${DAY_LABELS[d.dayOfWeek]}: o horário de fechar deve ser depois do de abrir.`)
        return
      }
      if (d.hasLunch) {
        if (d.lunchEnd <= d.lunchStart) {
          toast.error(`${DAY_LABELS[d.dayOfWeek]}: o fim do almoço deve ser depois do início.`)
          return
        }
        if (d.lunchStart < d.openTime || d.lunchEnd > d.closeTime) {
          toast.error(`${DAY_LABELS[d.dayOfWeek]}: o almoço deve ficar dentro do expediente.`)
          return
        }
      }
    }
    setBusy(true)
    try {
      await adminRepository.saveBusinessHours(
        openDays.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          openTime: d.openTime,
          closeTime: d.closeTime,
          slotGranularityMinutes: d.granularity,
          lunchStart: d.hasLunch ? d.lunchStart : null,
          lunchEnd: d.hasLunch ? d.lunchEnd : null,
        }))
      )
      toast.success("Horários salvos.")
      load()
    } catch {
      toast.error("Não foi possível salvar os horários.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        Horário de funcionamento
      </p>
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
        {week === null ? (
          Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
        ) : (
          <>
            {week.map((d) => (
              <div
                key={d.dayOfWeek}
                className="flex flex-col gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => patchDay(d.dayOfWeek, { open: !d.open })}
                    className={cn(
                      "flex h-9 w-28 shrink-0 items-center justify-between rounded-lg border px-3 text-sm font-medium transition-colors",
                      d.open
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {DAY_LABELS[d.dayOfWeek]}
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        d.open ? "bg-emerald-400" : "bg-muted-foreground/40"
                      )}
                    />
                  </button>

                  {d.open ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        type="time"
                        value={d.openTime}
                        onChange={(e) => patchDay(d.dayOfWeek, { openTime: e.target.value })}
                        className="h-9"
                      />
                      <span className="text-muted-foreground">–</span>
                      <Input
                        type="time"
                        value={d.closeTime}
                        onChange={(e) => patchDay(d.dayOfWeek, { closeTime: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  ) : (
                    <span className="flex-1 text-sm text-muted-foreground">Fechado</span>
                  )}
                </div>

                {d.open && (
                  <div className="ml-2 flex items-center gap-2 pl-[7.5rem]">
                    <button
                      type="button"
                      onClick={() => patchDay(d.dayOfWeek, { hasLunch: !d.hasLunch })}
                      className={cn(
                        "flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors",
                        d.hasLunch
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Coffee className="size-3.5" />
                      Almoço
                    </button>

                    {d.hasLunch && (
                      <div className="flex flex-1 items-center gap-2">
                        <Input
                          type="time"
                          value={d.lunchStart}
                          onChange={(e) => patchDay(d.dayOfWeek, { lunchStart: e.target.value })}
                          className="h-7 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">–</span>
                        <Input
                          type="time"
                          value={d.lunchEnd}
                          onChange={(e) => patchDay(d.dayOfWeek, { lunchEnd: e.target.value })}
                          className="h-7 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => patchDay(d.dayOfWeek, { hasLunch: false })}
                          aria-label="Remover almoço"
                          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-accent hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <Button disabled={busy} onClick={save} className="mt-2 h-9">
              Salvar horários
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
