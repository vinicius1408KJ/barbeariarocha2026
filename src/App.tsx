import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { RepositoryProvider } from "@/lib/repository/RepositoryContext"
import { HomePage } from "@/pages/HomePage"
import { MeusHorariosPage } from "@/pages/MeusHorariosPage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { BookingLayout } from "@/pages/booking/BookingLayout"
import { ServiceSelectPage } from "@/pages/booking/ServiceSelectPage"
import { BarberSelectPage } from "@/pages/booking/BarberSelectPage"
import { DateTimeSelectPage } from "@/pages/booking/DateTimeSelectPage"
import { ContactInfoPage } from "@/pages/booking/ContactInfoPage"
import { ConfirmationPage } from "@/pages/booking/ConfirmationPage"

function App() {
  return (
    <RepositoryProvider>
      <BrowserRouter>
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
        <Toaster theme="dark" />
      </BrowserRouter>
    </RepositoryProvider>
  )
}

export default App
