import { motion } from "framer-motion"
import { cn, formatPriceBRL } from "@/lib/utils"
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
          {service.durationMinutes} min
        </p>
      </div>
      <span className="text-lg font-semibold text-primary">{formatPriceBRL(service.priceCents)}</span>
    </motion.button>
  )
}
