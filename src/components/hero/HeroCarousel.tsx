import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

const SLIDE_DURATION_MS = 5000

export function HeroCarousel({
  images,
  className,
}: {
  images: { src: string; alt: string }[]
  className?: string
}) {
  const [index, setIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (images.length <= 1 || prefersReducedMotion) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length)
    }, SLIDE_DURATION_MS)
    return () => clearInterval(timer)
  }, [images.length, prefersReducedMotion])

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <AnimatePresence mode="sync">
        <motion.img
          key={images[index].src}
          src={images[index].src}
          alt={images[index].alt}
          className="absolute inset-0 size-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
          loading={index === 0 ? "eager" : "lazy"}
        />
      </AnimatePresence>

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 72% 28%, rgba(201,162,74,0.22), transparent 60%), linear-gradient(160deg, rgba(23,23,23,0.35) 0%, rgba(10,10,10,0.75) 70%)",
        }}
      />

      {images.length > 1 && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-6 bg-primary" : "w-1.5 bg-white/40 hover:bg-white/60"
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
