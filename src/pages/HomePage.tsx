import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Brush, Calendar, CalendarClock, MapPin, Scissors } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InstagramIcon, RazorIcon } from "@/components/hero/icons"
import { HeroCarousel } from "@/components/hero/HeroCarousel"

const EASE = [0.22, 1, 0.36, 1] as const

const INSTAGRAM_HANDLE = "barbearia_rocha.l.t"
const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`

const ADDRESS = "R. Braulino Botelho - Centro, São Raimundo das Mangabeiras - MA, 65840-000"
const MAPS_URL = "https://share.google/CtaphZM0GHdThnUuf"

const FEATURES_BG_IMAGE_URL =
  "https://www.guiadasemana.com.br/contentFiles/image/opt_w1024h1024/2017/02/FEA/49393_shutterstock-barbearia.jpg"

const HERO_IMAGES = [
  {
    src: "https://img.magnific.com/fotos-gratis/homem-num-salao-de-barbearia-a-cortar-o-cabelo-e-a-barba_1303-20953.jpg",
    alt: "Barbeiro finalizando corte e barba na Barbearia Rocha",
  },
  {
    src: FEATURES_BG_IMAGE_URL,
    alt: "Ambiente da Barbearia Rocha",
  },
  {
    src: "https://i.ibb.co/yBgkJ4Km/image.png",
    alt: "Barbearia Rocha",
  },
]

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
          <div className="flex items-center gap-5">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase transition-colors hover:text-primary"
            >
              <InstagramIcon className="size-4" />
              <span className="hidden sm:inline normal-case tracking-normal">@{INSTAGRAM_HANDLE}</span>
            </a>
          </div>
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
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                render={<Link to="/agendar/servico" />}
                nativeButton={false}
                size="lg"
                className="h-12 gap-2 px-7 text-sm"
              >
                <Calendar className="size-4" />
                Agendar Horário
              </Button>
              <Button
                render={<Link to="/meus-horarios" />}
                nativeButton={false}
                variant="outline"
                size="lg"
                className="h-12 gap-2 px-7 text-sm"
              >
                <CalendarClock className="size-4" />
                Meus Horários
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Precisa remarcar ou cancelar? Acesse Meus Horários com o telefone usado no
              agendamento.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
            className="relative aspect-[4/5] lg:aspect-auto lg:h-[560px]"
          >
            <HeroCarousel
              images={HERO_IMAGES}
              className="size-full rounded-2xl border border-white/5"
            />
          </motion.div>
        </div>

        <div className="relative overflow-hidden border-t border-border">
          <img
            src={FEATURES_BG_IMAGE_URL}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover opacity-20"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-background/85" />
          <div className="relative mx-auto grid max-w-7xl grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
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

      <footer className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-6 py-4 sm:px-10">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Scissors className="size-4" strokeWidth={2.5} />
              </span>
              <div className="leading-tight">
                <p className="text-[10px] font-semibold tracking-[0.3em] text-primary uppercase">Barbearia</p>
                <p className="font-display text-lg tracking-wide text-foreground">Rocha</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1.5 sm:items-start">
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noreferrer"
                className="flex max-w-xs items-start gap-2 text-sm text-muted-foreground transition-colors hover:text-primary sm:max-w-sm"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{ADDRESS}</span>
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                <InstagramIcon className="size-4 shrink-0" />
                @{INSTAGRAM_HANDLE}
              </a>
            </div>
          </div>

          <p className="mt-4 border-t border-border pt-3 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Barbearia Rocha
          </p>
        </div>
      </footer>
    </div>
  )
}
