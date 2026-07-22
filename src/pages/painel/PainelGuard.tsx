import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom"
import { Bell, BarChart3, CalendarDays, LogOut, Settings, Wallet } from "lucide-react"
import { Logo } from "@/components/layout/Logo"
import { cn } from "@/lib/utils"
import { useStaffSession } from "@/lib/auth/StaffSessionContext"
import { NotificationsProvider, useNotifications } from "@/lib/notifications/NotificationsContext"

const NAV = [
  { to: "/painel/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/painel/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/painel/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/painel/configuracoes", label: "Config", icon: Settings },
]

function NotificationBell() {
  const { unread } = useNotifications()
  return (
    <NavLink
      to="/painel/notificacoes"
      className={({ isActive }) =>
        cn(
          "relative flex size-9 items-center justify-center rounded-lg transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground"
        )
      }
      aria-label="Notificações"
    >
      <Bell className="size-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </NavLink>
  )
}

export function PainelGuard() {
  const { session, logout } = useStaffSession()
  const location = useLocation()

  if (!session) {
    return <Navigate to="/painel/login" replace state={{ from: location.pathname }} />
  }

  return (
    <NotificationsProvider>
    <div className="min-h-svh bg-background pb-20 sm:pb-0">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link to="/painel/agenda">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <Icon className="size-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>
          <NotificationBell />
          <span className="hidden text-xs font-medium tracking-wide text-muted-foreground lg:inline">
            {session.barberName}
          </span>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <Outlet />

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur sm:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold tracking-wide uppercase transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
    </NotificationsProvider>
  )
}
