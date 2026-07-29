import { useState } from "react"
import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  addDays,
  subMonths,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const WEEKDAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"]

type SingleProps = {
  mode?: "single"
  selected: Date
  onSelect: (date: Date) => void
}

type RangeProps = {
  mode: "range"
  selectedRange: { from: Date | null; to: Date | null }
  onSelectRange: (range: { from: Date; to: Date | null }) => void
}

// A self-contained month grid — avoids the native <input type="date"> picker,
// which is unreliable across mobile browsers (Safari especially).
export function MiniCalendar(props: SingleProps | RangeProps) {
  const initialMonth =
    props.mode === "range" ? (props.selectedRange.from ?? new Date()) : props.selected
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(initialMonth))

  const gridStart = startOfWeek(startOfMonth(viewMonth))
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))

  const monthLabel = format(viewMonth, "MMMM yyyy", { locale: ptBR })

  function handleDayClick(day: Date) {
    if (props.mode === "range") {
      const { from, to } = props.selectedRange
      // Nothing picked yet, or a full range already exists → start fresh.
      if (!from || to) {
        props.onSelectRange({ from: day, to: null })
        return
      }
      // One endpoint picked → complete the range (swap if picked backwards).
      if (day < from) {
        props.onSelectRange({ from: day, to: from })
      } else {
        props.onSelectRange({ from, to: day })
      }
      return
    }
    props.onSelect(day)
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          aria-label="Mês anterior"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold capitalize text-foreground">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          aria-label="Próximo mês"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {props.mode === "range" && (
        <p className="mb-2 text-center text-xs text-muted-foreground">
          {!props.selectedRange.from
            ? "Toque no dia inicial"
            : !props.selectedRange.to
              ? "Toque no dia final"
              : `${format(props.selectedRange.from, "dd/MM")} – ${format(props.selectedRange.to, "dd/MM")}`}
        </p>
      )}

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((d, i) => (
          <div
            key={i}
            className="flex h-7 items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth)
          const isToday = isSameDay(day, new Date())

          let isSelected = false
          let isRangeEnd = false
          let isInRange = false

          if (props.mode === "range") {
            const { from, to } = props.selectedRange
            isRangeEnd = Boolean((from && isSameDay(day, from)) || (to && isSameDay(day, to)))
            isInRange = Boolean(from && to && isWithinInterval(day, { start: from, end: to }))
          } else {
            isSelected = isSameDay(day, props.selected)
          }

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDayClick(day)}
              className={cn(
                "flex h-9 items-center justify-center rounded-lg text-sm transition-colors",
                !inMonth && "text-muted-foreground/30",
                inMonth && !isSelected && !isRangeEnd && !isInRange && "text-foreground hover:bg-accent",
                (isSelected || isRangeEnd) && "bg-primary font-semibold text-primary-foreground",
                isInRange && !isRangeEnd && "bg-primary/20 text-foreground",
                !isSelected && !isRangeEnd && isToday && inMonth && "ring-1 ring-primary/50"
              )}
            >
              {format(day, "d")}
            </button>
          )
        })}
      </div>
    </div>
  )
}
