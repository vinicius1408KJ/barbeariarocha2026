import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Brush, Calendar, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RazorIcon } from "@/components/hero/icons"

const EASE = [0.22, 1, 0.36, 1] as const

const FEATURES = [
  { icon: Scissors, label: "Cortes Clássicos" },
  { icon: Brush, label: "Barbas Bem Feitas" },
  { icon: RazorIcon, label: "Experiência de Verdade" },
]

function HeroBrandMark() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Scissors className="size-5" strokeWidth={2.5} />
      </span>
      <div className="text-left leading-tight">
        <p className="text-[10px] font-semibold tracking-[0.3em] text-primary uppercase">Barbearia</p>
        <p className="font-display text-2xl tracking-wide text-foreground">Rocha</p>
      </div>
    </div>
  )
}

export function HomePage() {
  return (
    <div className="min-h-svh bg-background">
      <section className="relative overflow-hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 pt-6 sm:px-10">
          <HeroBrandMark />
          <Link
            to="/painel"
            className="text-xs font-semibold tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            Painel
          </Link>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-6 pt-12 pb-16 sm:px-10 lg:grid-cols-2 lg:items-center lg:gap-16 lg:pt-16 lg:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="text-left"
          >
            <p className="text-xs font-semibold tracking-[0.35em] text-primary uppercase">
              Estilo. Tradição.
            </p>
            <h1 className="font-display mt-4 text-6xl leading-[0.92] tracking-wide sm:text-7xl lg:text-8xl">
              <span className="text-foreground">Barbearia</span>
              <br />
              <span className="text-primary">Rocha</span>
            </h1>
            <p className="mt-6 max-w-sm text-base text-muted-foreground">
              Mais que um corte, uma experiência.
            </p>
            <Button
              render={<Link to="/agendar/servico" />}
              nativeButton={false}
              size="lg"
              className="mt-8 h-12 gap-2 px-7 text-sm"
            >
              <Calendar className="size-4" />
              Agendar Horário
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
            className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/5 lg:aspect-auto lg:h-[560px]"
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 72% 28%, rgba(201,162,74,0.18), transparent 60%), linear-gradient(160deg, #171717 0%, #0a0a0a 70%)",
              }}
            />
            <Scissors
              className="absolute -right-8 -bottom-8 size-64 text-white/[0.04]"
              strokeWidth={0.5}
            />
          </motion.div>
        </div>

        <div className="border-t border-border bg-card/40">
          <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center justify-center gap-3 px-6 py-6 sm:flex-col sm:gap-2.5"
              >
                <Icon className="size-6 w-9 text-primary" strokeWidth={1.5} />
                <span className="text-xs font-semibold tracking-widest text-foreground uppercase">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
