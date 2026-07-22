import { motion } from "framer-motion"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Barber } from "@/lib/types"

export function BarberCard({ barber, onSelect }: { barber: Barber; onSelect: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-4 py-6 transition-colors hover:border-primary/50 hover:bg-accent"
      )}
    >
      <span className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-secondary text-muted-foreground">
        {barber.avatarUrl ? (
          <img src={barber.avatarUrl} alt={barber.name} className="size-full object-cover" />
        ) : (
          <User className="size-7" />
        )}
      </span>
      <div className="text-center">
        <p className="font-medium text-foreground">{barber.name}</p>
        <p className="mt-0.5 text-xs font-semibold tracking-wide text-primary uppercase">
          Cadeira {barber.chairNumber}
        </p>
      </div>
    </motion.button>
  )
}
