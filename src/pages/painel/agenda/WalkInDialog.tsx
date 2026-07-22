import { useState } from "react"
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
import type { Service } from "@/lib/types"

export function WalkInDialog({
  barberId,
  services,
  open,
  onOpenChange,
  onCreated,
}: {
  barberId: string
  services: Service[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (name.trim().length < 2) {
      toast.error("Informe o nome do cliente.")
      return
    }
    setBusy(true)
    try {
      await adminRepository.createWalkIn({
        clientName: name.trim(),
        clientPhone: phone.trim() || null,
        serviceId,
        barberId,
      })
      toast.success("Adicionado à fila.")
      setName("")
      setPhone("")
      setServiceId(null)
      onCreated()
      onOpenChange(false)
    } catch {
      toast.error("Não foi possível adicionar à fila.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar walk-in</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wi-name">Nome do cliente</Label>
            <Input id="wi-name" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wi-phone">Telefone (opcional)</Label>
            <Input id="wi-phone" placeholder="(11) 91234-5678" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Serviço (opcional)</Label>
            <div className="grid grid-cols-2 gap-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setServiceId((prev) => (prev === s.id ? null : s.id))}
                  className={
                    "h-9 rounded-lg border px-2 text-xs font-medium transition-colors " +
                    (serviceId === s.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/50")
                  }
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <Button disabled={busy} onClick={submit} className="mt-1 h-10">
            Adicionar à fila
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
