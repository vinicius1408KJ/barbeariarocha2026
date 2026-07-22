import { useNavigate } from "react-router-dom"
import { PageHeader } from "@/components/layout/PageHeader"
import { BarberCard } from "@/components/booking/BarberCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useBookingFlow } from "@/hooks/useBookingFlow"
import { useBarbers } from "@/hooks/useBarbers"
import type { Barber } from "@/lib/types"

export function BarberSelectPage() {
  const { barbers, isLoading } = useBarbers()
  const { dispatch } = useBookingFlow()
  const navigate = useNavigate()

  function handleSelect(barber: Barber) {
    dispatch({ type: "SELECT_BARBER", barber })
    navigate("/agendar/horario")
  }

  return (
    <div className="min-h-svh">
      <PageHeader backTo="/agendar/servico" backLabel="Voltar" />

      <div className="mx-auto max-w-lg px-6 py-8">
        <h1 className="mb-6 text-center font-display text-2xl tracking-wide">Escolha o profissional</h1>

        <div className="grid grid-cols-2 gap-4">
          {isLoading
            ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-[152px] rounded-xl" />)
            : barbers.map((barber) => (
                <BarberCard key={barber.id} barber={barber} onSelect={() => handleSelect(barber)} />
              ))}
        </div>
      </div>
    </div>
  )
}
