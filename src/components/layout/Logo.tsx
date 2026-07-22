import { Scissors } from "lucide-react"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Scissors className="size-4" strokeWidth={2.5} />
      </span>
      <span className="font-display text-xl tracking-wider">ROCHA</span>
    </div>
  )
}
