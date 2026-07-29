import { lazy, Suspense } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import { RepositoryProvider } from "@/lib/repository/RepositoryContext"
import { PanelLoading } from "@/components/layout/PanelLoading"
import { PainelLayout } from "@/pages/painel/PainelLayout"
import { PainelGuard } from "@/pages/painel/PainelGuard"
import { LoginPage } from "@/pages/painel/LoginPage"

// Each panel screen loads on demand instead of all bundling into one big
// chunk — a barber logging in to check the agenda no longer downloads the
// PDF/Excel export libraries or the reports charts up front.
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage }))
)
const AgendaPage = lazy(() =>
  import("@/pages/painel/agenda/AgendaPage").then((m) => ({ default: m.AgendaPage }))
)
const NotificacoesPage = lazy(() =>
  import("@/pages/painel/notificacoes/NotificacoesPage").then((m) => ({
    default: m.NotificacoesPage,
  }))
)
const FinanceiroPage = lazy(() =>
  import("@/pages/painel/financeiro/FinanceiroPage").then((m) => ({ default: m.FinanceiroPage }))
)
const RelatoriosPage = lazy(() =>
  import("@/pages/painel/relatorios/RelatoriosPage").then((m) => ({ default: m.RelatoriosPage }))
)
const ConfiguracoesPage = lazy(() =>
  import("@/pages/painel/configuracoes/ConfiguracoesPage").then((m) => ({
    default: m.ConfiguracoesPage,
  }))
)

// Staff-only deployment: this is the entire app served on the admin domain
// (barbeariarocha2026adm.vercel.app). The booking site is a separate Vercel
// project/deployment (see App.tsx) so clients never see or reach this one.
function PanelApp() {
  return (
    <RepositoryProvider>
      <BrowserRouter>
        <Suspense fallback={<PanelLoading />}>
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
        </Suspense>
        <Toaster theme="dark" />
      </BrowserRouter>
    </RepositoryProvider>
  )
}

export default PanelApp
