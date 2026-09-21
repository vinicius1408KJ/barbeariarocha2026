import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { WifiOff } from "lucide-react"
import { Toaster } from "@/components/ui/sonner"
import { RepositoryProvider, useRepository } from "@/lib/repository/RepositoryContext"
import { useAutoUpdate } from "@/hooks/useAutoUpdate"
import { HomePage } from "@/pages/HomePage"
import { MeusHorariosPage } from "@/pages/MeusHorariosPage"
import { BookingLayout } from "@/pages/booking/BookingLayout"
import { ServiceSelectPage } from "@/pages/booking/ServiceSelectPage"
import { BarberSelectPage } from "@/pages/booking/BarberSelectPage"
import { DateTimeSelectPage } from "@/pages/booking/DateTimeSelectPage"
import { ContactInfoPage } from "@/pages/booking/ContactInfoPage"
import { ConfirmationPage } from "@/pages/booking/ConfirmationPage"

const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
)

// Reloading is unsafe between picking contact info and getting a confirmed
// appointment id back — anywhere earlier, the cart/date/time already
// persist in sessionStorage (see useBookingFlow), so a reload just resumes
// the flow with fresh code instead of losing anything.
function isUnsafeRoute(pathname: string): boolean {
  return pathname === "/agendar/contato" || pathname === "/agendar/confirmado"
}

// Without this the screens would just look empty (no services, no slots)
// and the client would assume the shop has nothing available, instead of
// understanding it's their connection.
function OfflineBanner() {
  const { isUnavailable, isResolving } = useRepository()
  if (isResolving || !isUnavailable) return null

  return (
    <div className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-xs font-medium text-destructive-foreground">
      <WifiOff className="size-3.5 shrink-0" />
      Sem conexão com o servidor. Recarregue a página para tentar de novo.
    </div>
  )
}

function AppRoutes() {
  const location = useLocation()
  useAutoUpdate(() => !isUnsafeRoute(location.pathname))

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/meus-horarios" element={<MeusHorariosPage />} />
        <Route path="/agendar" element={<BookingLayout />}>
          <Route index element={<Navigate to="/agendar/servico" replace />} />
          <Route path="servico" element={<ServiceSelectPage />} />
          <Route path="barbeiro" element={<BarberSelectPage />} />
          <Route path="horario" element={<DateTimeSelectPage />} />
          <Route path="contato" element={<ContactInfoPage />} />
          <Route path="confirmado" element={<ConfirmationPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <RepositoryProvider>
      <BrowserRouter>
        <OfflineBanner />
        <AppRoutes />
        <Toaster theme="dark" />
      </BrowserRouter>
    </RepositoryProvider>
  )
}

export default App
