import { motion } from "framer-motion"
import { cn, formatDurationShort, formatPriceBRL } from "@/lib/utils"
import type { Service } from "@/lib/types"

export function ServiceCard({
  service,
  onSelect,
}: {
  service: Service
  onSelect: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
      )}
    >
      <div>
        <p className="font-medium text-foreground">{service.name}</p>
        <p className="mt-1 text-xs tracking-wide text-muted-foreground uppercase">
          {formatDurationShort(service.durationMinutes)}
        </p>
      </div>
      <span className="text-lg font-semibold text-primary">{formatPriceBRL(service.priceCents)}</span>
    </motion.button>
  )
}

// Compact card for the grid view — same info, denser layout.
export function ServiceGridCard({
  service,
  onSelect,
}: {
  service: Service
  onSelect: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className="flex h-full flex-col items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent"
    >
      <p className="line-clamp-2 text-sm font-medium text-foreground">{service.name}</p>
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
