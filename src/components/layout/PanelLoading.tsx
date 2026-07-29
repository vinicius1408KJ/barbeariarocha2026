import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Scissors } from "lucide-react"

// Shown while a lazy-loaded panel route (or the initial JS bundle) is still
// downloading — replaces the blank/black flash with a branded splash. The
// bar fills to a real percentage instead of looping forever, so on a fast
// connection it still visibly completes (0→100%) rather than getting cut
// off mid-animation when React swaps this out.
export function PanelLoading() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Eases toward ~92% on its own (unknown real duration), then a route's
    // actual mount is what finally unmounts this component — the visual
    // finishing touch, not a fake "100%" that could lie about readiness.
    const start = performance.now()
    let frame: number
    const tick = () => {
      const elapsed = performance.now() - start
      setProgress(92 * (1 - Math.exp(-elapsed / 450)))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-4"
      >
        <motion.span
          animate={{ rotate: [0, -8, 8, -8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Scissors className="size-7" strokeWidth={2.25} />
        </motion.span>
        <div className="text-center leading-tight">
          <p className="text-[11px] font-semibold tracking-[0.3em] text-primary uppercase">
            Barbearia
          </p>
          <p className="font-display text-2xl tracking-wide text-foreground">Rocha</p>
        </div>
      </motion.div>

      <div className="h-1 w-40 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
