import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { adminRepository } from "@/lib/repository/adminRepository"
import { useAvailableSlots } from "@/hooks/useAvailableSlots"
import { TimeSlotGrid } from "@/components/booking/TimeSlotGrid"
import type { Service } from "@/lib/types"

export function ManualAppointmentDialog({
  barberId,
  services,
  date,
  open,
  onOpenChange,
  onCreated,
}: {
  barberId: string
  services: Service[]
  date: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const selectedServices = services.filter((s) => serviceIds.includes(s.id))
  const totalDurationMinutes = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0)

  const { slots, isLoading } = useAvailableSlots({
    barberId,
    date,
    totalDurationMinutes: totalDurationMinutes || null,
  })

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
    setSelectedTime(null)
  }

  function reset() {
    setName("")
    setPhone("")
    setServiceIds([])
    setSelectedTime(null)
  }

  async function submit() {
    if (name.trim().length < 2) {
      toast.error("Informe o nome do cliente.")
      return
    }
    if (serviceIds.length === 0) {
      toast.error("Selecione ao menos um serviço.")
      return
    }
    if (!selectedTime) {
      toast.error("Selecione um horário.")
      return
    }
    setBusy(true)
    try {
      await adminRepository.createManualAppointment({
        barberId,
        services: selectedServices,
        date,
        startTime: selectedTime,
        clientName: name.trim(),
        clientPhone: phone.trim() || null,
      })
      toast.success("Agendamento criado.")
      reset()
      onCreated()
      onOpenChange(false)
    } catch {
      toast.error("Não foi possível criar o agendamento. O horário pode já estar ocupado.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar para cliente</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ma-name">Nome do cliente</Label>
            <Input id="ma-name" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ma-phone">Telefone (opcional)</Label>
            <Input
              id="ma-phone"
              placeholder="(11) 91234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Serviços</Label>
            <div className="grid grid-cols-2 gap-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  className={
                    "h-9 rounded-lg border px-2 text-xs font-medium transition-colors " +
                    (serviceIds.includes(s.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/50")
                  }
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {serviceIds.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Horário — {date.split("-").reverse().join("/")}</Label>
              <TimeSlotGrid slots={slots} selectedTime={selectedTime} onSelect={setSelectedTime} isLoading={isLoading} />
            </div>
          )}

          <Button disabled={busy} onClick={submit} className="mt-1 h-10">
            Criar agendamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
