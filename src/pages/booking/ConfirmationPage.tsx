import { useEffect, useRef, useState } from "react"
import { Link, Navigate } from "react-router-dom"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { BOOKING_SESSION_KEY, useBookingFlow } from "@/hooks/useBookingFlow"
import { useRepository } from "@/lib/repository/RepositoryContext"
import { formatPriceBRL } from "@/lib/utils"
import type { Appointment } from "@/lib/types"

export function ConfirmationPage() {
  const { state } = useBookingFlow()
  const { repository, isResolving } = useRepository()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hasSubmitted = useRef(false)

  useEffect(() => {
    if (isResolving || hasSubmitted.current) return
    if (!state.service || !state.barber || !state.date || !state.time) return

    hasSubmitted.current = true
    repository
      .createAppointment({
        barberId: state.barber.id,
        serviceId: state.service.id,
        date: state.date,
        startTime: state.time,
        clientName: state.clientName,
        clientPhone: state.clientPhone,
      })
      .then((created) => {
        setAppointment(created)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erro ao criar agendamento")
        toast.error("Não foi possível concluir o agendamento. Tente novamente.")
      })
  }, [isResolving, repository, state])

  if (!state.service || !state.barber || !state.date || !state.time) {
    if (!appointment) return <Navigate to="/agendar/servico" replace />
  }

  const displayDate = state.date
    ? format(new Date(`${state.date}T00:00:00`), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : ""

  return (
    <div className="min-h-svh">
      <PageHeader />

      <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center">
        {error ? (
          <>
            <p className="text-sm text-destructive">{error}</p>
            <Button render={<Link to="/agendar/horario" />} nativeButton={false} className="mt-6">
              Tentar novamente
            </Button>
          </>
        ) : !appointment ? (
          <>
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Confirmando seu agendamento...</p>
          </>
        ) : (
          <>
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <CheckCircle2 className="size-7" />
            </span>
            <h1 className="mt-5 font-display text-3xl tracking-wide">AGENDADO!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Te esperamos na barbearia. Confira os detalhes abaixo.
            </p>

            <div className="mt-6 w-full rounded-xl border border-border bg-card p-5 text-left text-sm">
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Serviço</span>
                <span className="font-medium">{state.service?.name}</span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Profissional</span>
                <span className="font-medium">{state.barber?.name}</span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Data</span>
                <span className="font-medium">{displayDate}</span>
              </div>
              <div className="flex justify-between border-b border-border py-2">
                <span className="text-muted-foreground">Horário</span>
                <span className="font-medium">{appointment.startTime}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-semibold text-primary">
                  {state.service ? formatPriceBRL(state.service.priceCents) : ""}
                </span>
              </div>
            </div>

            <Button
              render={<Link to="/" onClick={() => sessionStorage.removeItem(BOOKING_SESSION_KEY)} />}
              nativeButton={false}
              size="lg"
              className="mt-8 h-12 w-full text-sm"
            >
              Voltar ao início
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
