import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function StarRating({
  value,
  onChange,
  size = "md",
  className,
}: {
  value: number
  onChange?: (v: number) => void
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const interactive = typeof onChange === "function"
  const starSize = size === "lg" ? "size-8" : size === "sm" ? "size-4" : "size-6"

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value
        const star = (
          <Star
            className={cn(
              starSize,
              filled ? "fill-primary text-primary" : "fill-transparent text-muted-foreground/40"
            )}
            strokeWidth={2}
          />
        )
        return interactive ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange!(n)}
            aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
            className="transition-transform active:scale-90"
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        )
      })}
    </div>
  )
}
