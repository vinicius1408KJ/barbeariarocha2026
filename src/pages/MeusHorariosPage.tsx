import { useState } from "react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Search, X } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/ui/StarRating"
import { useRepository } from "@/lib/repository/RepositoryContext"
import { useServices } from "@/hooks/useServices"
import { useBarbers } from "@/hooks/useBarbers"
import { formatPriceBRL } from "@/lib/utils"
import { STATUS_LABEL } from "@/lib/statusLabels"
import type { Appointment } from "@/lib/types"

export function MeusHorariosPage() {
  const { repository } = useRepository()
  const { services } = useServices()
  const { barbers } = useBarbers()
  const [phone, setPhone] = useState("")
  const [appointments, setAppointments] = useState<Appointment[] | null>(null)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return
    setIsLoading(true)
    const result = await repository.getAppointmentsByPhone(phone)
    setAppointments(result)
    const reviews = await repository.getReviews(result.map((a) => a.id))
    setRatings(Object.fromEntries(reviews.map((r) => [r.appointmentId, r.rating])))
    setIsLoading(false)
  }

  async function handleCancel(id: string) {
    await repository.cancelAppointment(id)
    setAppointments((prev) => prev?.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)) ?? null)
    toast.success("Agendamento cancelado.")
  }

  async function handleRate(appointment: Appointment, rating: number) {
    setRatings((prev) => ({ ...prev, [appointment.id]: rating }))
    try {
      await repository.submitReview({
        appointmentId: appointment.id,
        barberId: appointment.barberId,
        rating,
        comment: null,
      })
      toast.success("Obrigado pela avaliação!")
    } catch {
      setRatings((prev) => {
        const next = { ...prev }
        delete next[appointment.id]
        return next
      })
      toast.error("Não foi possível enviar a avaliação.")
    }
  }

  return (
    <motion.div
      className="min-h-svh"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <PageHeader backTo="/agendar/servico" backLabel="Novo agendamento" />

      <div className="mx-auto max-w-lg px-6 py-8">
        <h1 className="mb-6 text-center font-display text-2xl tracking-wide">Meus Horários</h1>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Seu telefone com DDD"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Button type="submit" disabled={isLoading}>
            <Search className="size-4" />
          </Button>
        </form>

        <div className="mt-6 flex flex-col gap-3">
          {appointments?.length === 0 && (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Nenhum agendamento encontrado para esse telefone.
            </p>
          )}

          {appointments?.map((appointment) => {
            const service = services.find((s) => s.id === appointment.serviceId)
            const barber = barbers.find((b) => b.id === appointment.barberId)
            const canCancel = appointment.status === "scheduled"

            return (
              <div key={appointment.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{service?.name ?? "Serviço"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {barber?.name} · {format(new Date(`${appointment.date}T00:00:00`), "dd/MM/yyyy", { locale: ptBR })} às {appointment.startTime}
                    </p>
                  </div>
                  <Badge variant={appointment.status === "cancelled" ? "outline" : "default"}>
                    {STATUS_LABEL[appointment.status]}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">
                    {service ? formatPriceBRL(service.priceCents) : ""}
                  </span>
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => handleCancel(appointment.id)}
                      className="flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
                    >
                      <X className="size-3.5" />
                      Cancelar
                    </button>
                  )}
                </div>

                {appointment.status === "completed" && (
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">
                      {ratings[appointment.id] ? "Sua avaliação" : "Como foi o atendimento?"}
                    </span>
                    <StarRating
                      value={ratings[appointment.id] ?? 0}
                      onChange={
                        ratings[appointment.id]
                          ? undefined
                          : (r) => handleRate(appointment, r)
                      }
                      size="sm"
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
