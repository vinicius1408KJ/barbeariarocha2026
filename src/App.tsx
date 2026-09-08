import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { RepositoryProvider } from "@/lib/repository/RepositoryContext"
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
        <AppRoutes />
        <Toaster theme="dark" />
      </BrowserRouter>
    </RepositoryProvider>
  )
}

export default App
