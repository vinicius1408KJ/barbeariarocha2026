import { useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { adminRepository } from "@/lib/repository/adminRepository"
import { minutesToTime, timeToMinutes } from "@/lib/utils"

const IMMEDIATE_DURATIONS = [15, 30, 60, 120]

export function BlockTimeDialog({
  barberId,
  date,
  open,
  onOpenChange,
  onBlocked,
}: {
  barberId: string
  date: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onBlocked: () => void
}) {
  const [mode, setMode] = useState<"immediate" | "planned">("immediate")
  const [start, setStart] = useState("12:00")
  const [end, setEnd] = useState("13:00")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  async function blockImmediate(minutes: number) {
    setBusy(true)
    try {
      const now = new Date()
      const startM = now.getHours() * 60 + now.getMinutes()
      await adminRepository.blockSlot({
        barberId,
        date: format(now, "yyyy-MM-dd"),
        startTime: minutesToTime(startM),
        endTime: minutesToTime(startM + minutes),
        reason: reason.trim() || "Bloqueio imediato",
        isImmediate: true,
      })
      toast.success(`Bloqueado por ${minutes} min.`)
      onBlocked()
      onOpenChange(false)
    } catch {
      toast.error("Não foi possível bloquear.")
    } finally {
      setBusy(false)
    }
  }

  async function blockPlanned() {
    if (timeToMinutes(end) <= timeToMinutes(start)) {
      toast.error("Horário final deve ser após o inicial.")
      return
    }
    setBusy(true)
    try {
      await adminRepository.blockSlot({
        barberId,
        date,
        startTime: start,
        endTime: end,
        reason: reason.trim() || "Bloqueio",
        isImmediate: false,
      })
      toast.success("Horário bloqueado.")
      onBlocked()
      onOpenChange(false)
    } catch {
      toast.error("Não foi possível bloquear.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bloquear horário</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-card p-1">
          <button
            type="button"
            onClick={() => setMode("immediate")}
            className={
              "flex-1 rounded-md py-2 text-xs font-semibold tracking-wide uppercase transition-colors " +
              (mode === "immediate" ? "bg-primary text-primary-foreground" : "text-muted-foreground")
            }
          >
            Agora
          </button>
          <button
            type="button"
            onClick={() => setMode("planned")}
            className={
              "flex-1 rounded-md py-2 text-xs font-semibold tracking-wide uppercase transition-colors " +
              (mode === "planned" ? "bg-primary text-primary-foreground" : "text-muted-foreground")
            }
          >
            Planejar
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="block-reason">Motivo (opcional)</Label>
          <Input
            id="block-reason"
            placeholder="Almoço, folga, pausa..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {mode === "immediate" ? (
          <div className="grid grid-cols-4 gap-2">
            {IMMEDIATE_DURATIONS.map((m) => (
              <Button key={m} variant="outline" disabled={busy} onClick={() => blockImmediate(m)}>
                {m < 60 ? `${m}m` : `${m / 60}h`}
              </Button>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="block-start">Início</Label>
                <Input id="block-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="block-end">Fim</Label>
                <Input id="block-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <Button disabled={busy} onClick={blockPlanned} className="h-10">
              Bloquear
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
