import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { RepositoryProvider } from "@/lib/repository/RepositoryContext"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { PainelLayout } from "@/pages/painel/PainelLayout"
import { PainelGuard } from "@/pages/painel/PainelGuard"
import { LoginPage } from "@/pages/painel/LoginPage"
import { AgendaPage } from "@/pages/painel/agenda/AgendaPage"
import { NotificacoesPage } from "@/pages/painel/notificacoes/NotificacoesPage"
import { FinanceiroPage } from "@/pages/painel/financeiro/FinanceiroPage"
import { RelatoriosPage } from "@/pages/painel/relatorios/RelatoriosPage"
import { ConfiguracoesPage } from "@/pages/painel/configuracoes/ConfiguracoesPage"

// Staff-only deployment: this is the entire app served on the admin domain
// (barbeariarocha2026adm.vercel.app). The booking site is a separate Vercel
// project/deployment (see App.tsx) so clients never see or reach this one.
function PanelApp() {
  return (
    <RepositoryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/rocha-adm" replace />} />
          <Route path="/rocha-adm" element={<PainelLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route element={<PainelGuard />}>
              <Route index element={<Navigate to="/rocha-adm/agenda" replace />} />
              <Route path="agenda" element={<AgendaPage />} />
              <Route path="notificacoes" element={<NotificacoesPage />} />
              <Route path="financeiro" element={<FinanceiroPage />} />
              <Route path="relatorios" element={<RelatoriosPage />} />
              <Route path="configuracoes" element={<ConfiguracoesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster theme="dark" />
      </BrowserRouter>
    </RepositoryProvider>
  )
}

export default PanelApp
