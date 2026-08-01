import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { cn, formatDurationShort, formatPriceBRL } from "@/lib/utils"
import type { Service } from "@/lib/types"

export function ServiceCard({
  service,
  isSelected,
  onToggle,
}: {
  service: Service
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border px-5 py-4 text-left transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/50 hover:bg-accent"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
          )}
        >
          {isSelected && <Check className="size-3" strokeWidth={3} />}
        </span>
        <div>
          <p className="font-medium text-foreground">{service.name}</p>
          <p className="mt-1 text-xs tracking-wide text-muted-foreground uppercase">
            {formatDurationShort(service.durationMinutes)}
          </p>
        </div>
      </div>
      <span className="text-lg font-semibold text-primary">{formatPriceBRL(service.priceCents)}</span>
    </motion.button>
  )
}

// Compact card for the grid view — same info, denser layout.
export function ServiceGridCard({
  service,
  isSelected,
  onToggle,
}: {
  service: Service
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative flex h-full flex-col items-start justify-between gap-3 rounded-xl border p-4 text-left transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary/50 hover:bg-accent"
      )}
    >
      {isSelected && (
        <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
      <p className="line-clamp-2 pr-6 text-sm font-medium text-foreground">{service.name}</p>
      <div className="flex w-full items-end justify-between gap-2">
        <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
          {formatDurationShort(service.durationMinutes)}
        </span>
        <span className="text-base font-semibold text-primary">
          {formatPriceBRL(service.priceCents)}
        </span>
      </div>
    </motion.button>
  )
}
