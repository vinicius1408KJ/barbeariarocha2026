import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Delete, User } from "lucide-react"
import { toast } from "sonner"
import { Logo } from "@/components/layout/Logo"
import { cn } from "@/lib/utils"
import { adminRepository } from "@/lib/repository/adminRepository"
import { useStaffSession } from "@/lib/auth/StaffSessionContext"
import type { Barber } from "@/lib/types"

const PIN_LENGTH = 4

export function LoginPage() {
  const { session, login } = useStaffSession()
  const navigate = useNavigate()
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [selected, setSelected] = useState<Barber | null>(null)
  const [pin, setPin] = useState("")
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (session) navigate("/painel/agenda", { replace: true })
  }, [session, navigate])

  useEffect(() => {
    adminRepository.listBarbers().then(setBarbers).catch(() => setBarbers([]))
  }, [])

  useEffect(() => {
    if (!selected || pin.length !== PIN_LENGTH || checking) return
    setChecking(true)
    login(selected.id, selected.name, pin).then((ok) => {
      if (ok) {
        navigate("/painel/agenda", { replace: true })
      } else {
        toast.error("PIN incorreto.")
        setPin("")
        setChecking(false)
      }
    })
  }, [pin, selected, checking, login, navigate])

  function press(digit: string) {
    setPin((prev) => (prev.length < PIN_LENGTH ? prev + digit : prev))
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6">
      <Logo className="mb-10" />

      {!selected ? (
        <div className="w-full max-w-sm">
          <p className="mb-5 text-center text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Quem está atendendo?
          </p>
          <div className="grid grid-cols-2 gap-4">
            {barbers.map((barber) => (
              <motion.button
                key={barber.id}
                type="button"
                onClick={() => setSelected(barber)}
                whileTap={{ scale: 0.97 }}
                className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-4 py-6 transition-colors hover:border-primary/50 hover:bg-accent"
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
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-xs">
          <p className="text-center text-sm text-muted-foreground">
            Olá, <span className="font-semibold text-foreground">{selected.name}</span>
          </p>
          <p className="mt-1 mb-6 text-center text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Digite seu PIN
          </p>

          <div className="mb-8 flex justify-center gap-3">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-3.5 rounded-full border transition-colors",
                  i < pin.length ? "border-primary bg-primary" : "border-border bg-transparent"
                )}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => press(d)}
                className="h-14 rounded-xl border border-border bg-card text-xl font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-accent active:scale-95"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setSelected(null)
                setPin("")
              }}
              className="h-14 rounded-xl text-xs font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={() => press("0")}
              className="h-14 rounded-xl border border-border bg-card text-xl font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-accent active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin((prev) => prev.slice(0, -1))}
              className="flex h-14 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground active:scale-95"
            >
              <Delete className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
