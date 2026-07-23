import { useCallback, useEffect, useState } from "react"
import { Pencil, Plus, Power, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { adminRepository } from "@/lib/repository/adminRepository"
import { formatPriceBRL } from "@/lib/utils"
import type { Service } from "@/lib/types"

export function ServicesSection() {
  const [services, setServices] = useState<Service[] | null>(null)
  const [busy, setBusy] = useState(false)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [duration, setDuration] = useState("")

  const load = useCallback(async () => {
    try {
      setServices(await adminRepository.listAllServices())
    } catch {
      setServices([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openNew() {
    setEditing(null)
    setName("")
    setPrice("")
    setDuration("")
    setOpen(true)
  }

  function openEdit(s: Service) {
    setEditing(s)
    setName(s.name)
    setPrice((s.priceCents / 100).toString().replace(".", ","))
    setDuration(String(s.durationMinutes))
    setOpen(true)
  }

  async function save() {
    const cents = Math.round(parseFloat(price.replace(",", ".")) * 100)
    const mins = parseInt(duration, 10)
    if (!name.trim()) return toast.error("Informe o nome do serviço.")
    if (!cents || cents <= 0) return toast.error("Informe um preço válido.")
    if (!mins || mins <= 0) return toast.error("Informe a duração em minutos.")
    setBusy(true)
    try {
      if (editing) {
        await adminRepository.updateService(editing.id, {
          name: name.trim(),
          priceCents: cents,
          durationMinutes: mins,
        })
        toast.success("Serviço atualizado.")
      } else {
        await adminRepository.createService({
          name: name.trim(),
          priceCents: cents,
          durationMinutes: mins,
        })
        toast.success("Serviço adicionado.")
      }
      setOpen(false)
      load()
    } catch {
      toast.error("Não foi possível salvar.")
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(s: Service) {
    try {
      await adminRepository.updateService(s.id, { active: !s.active })
      load()
    } catch {
      toast.error("Não foi possível alterar.")
    }
  }

  async function remove(s: Service) {
    try {
      const result = await adminRepository.deleteService(s.id)
      toast.success(
        result === "deleted"
          ? "Serviço removido."
          : "Serviço tem histórico — foi desativado em vez de removido."
      )
      load()
    } catch {
      toast.error("Não foi possível remover.")
    }
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Serviços
        </p>
        <Button size="xs" variant="ghost" onClick={openNew}>
          <Plus className="size-3.5" />
          Novo
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {services === null ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
        ) : services.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            Nenhum serviço cadastrado.
          </p>
        ) : (
          services.map((s) => (
            <div
              key={s.id}
              className={
                "flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 " +
                (s.active ? "" : "opacity-55")
              }
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatPriceBRL(s.priceCents)} · {s.durationMinutes} min
                  {!s.active && " · inativo"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleActive(s)}
                aria-label={s.active ? "Desativar" : "Ativar"}
                className={
                  "flex size-8 items-center justify-center rounded-lg transition-colors " +
                  (s.active
                    ? "text-emerald-400 hover:bg-accent"
                    : "text-muted-foreground hover:bg-accent")
                }
              >
                <Power className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => openEdit(s)}
                aria-label="Editar"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(s)}
                aria-label="Remover"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="svc-name">Nome</Label>
              <Input
                id="svc-name"
                placeholder="Corte, Barba..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="svc-price">Preço</Label>
                <Input
                  id="svc-price"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="svc-duration">Duração (min)</Label>
                <Input
                  id="svc-duration"
                  inputMode="numeric"
                  placeholder="30"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>
            <Button disabled={busy} onClick={save} className="mt-1 h-10">
              {editing ? "Salvar" : "Adicionar serviço"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
