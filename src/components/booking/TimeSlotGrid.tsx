import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { TimeSlot } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"

const PERIODS = [
  { key: "manha", label: "Manhã", test: (hour: number) => hour < 12 },
  { key: "tarde", label: "Tarde", test: (hour: number) => hour >= 12 && hour < 18 },
  { key: "noite", label: "Noite", test: (hour: number) => hour >= 18 },
] as const

function groupByPeriod(slots: TimeSlot[]) {
  return PERIODS.map((period) => ({
    ...period,
    slots: slots.filter((slot) => period.test(Number(slot.time.slice(0, 2)))),
  })).filter((group) => group.slots.length > 0)
}

function SlotButton({
  slot,
  isSelected,
  onSelect,
}: {
  slot: TimeSlot
  isSelected: boolean
  onSelect: (time: string) => void
}) {
  return (
    <motion.button
      type="button"
      disabled={!slot.available}
      onClick={() => onSelect(slot.time)}
      whileTap={slot.available ? { scale: 0.95 } : undefined}
      animate={isSelected ? { scale: 1.04 } : { scale: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "h-11 rounded-lg border px-2 text-sm font-medium transition-[background-color,border-color,box-shadow,color] duration-200",
        !slot.available &&
          "cursor-not-allowed border-border/40 bg-transparent text-muted-foreground/35",
        slot.available &&
          !isSelected &&
          "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent",
        isSelected &&
          "border-primary bg-primary font-semibold text-primary-foreground shadow-[0_0_0_1px_rgba(201,162,74,0.5),0_6px_20px_-4px_rgba(201,162,74,0.55)]"
      )}
    >
      {slot.time}
    </motion.button>
  )
}

export function TimeSlotGrid({
  slots,
  selectedTime,
  onSelect,
  isLoading,
}: {
  slots: TimeSlot[]
  selectedTime: string | null
  onSelect: (time: string) => void
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {Array.from({ length: 16 }).map((_, i) => (
          <Skeleton key={i} className="h-11 rounded-lg" />
        ))}
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        Nenhum horário disponível nesta data.
      </p>
    )
  }

  const groups = groupByPeriod(slots)

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="mb-2 text-[11px] font-medium tracking-widest text-muted-foreground/80 uppercase">
            {group.label}
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {group.slots.map((slot) => (
              <SlotButton key={slot.time} slot={slot} isSelected={slot.time === selectedTime} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
