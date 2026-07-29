import { useEffect, useState } from "react"
import { Link, Navigate, NavLink, useLocation, useOutlet } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { Bell, BarChart3, CalendarDays, LogOut, Menu, Settings, Wallet, X } from "lucide-react"
import { Logo } from "@/components/layout/Logo"
import { cn } from "@/lib/utils"
import { useStaffSession } from "@/lib/auth/StaffSessionContext"
import { NotificationsProvider, useNotifications } from "@/lib/notifications/NotificationsContext"

const NAV = [
  { to: "/rocha-adm/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/rocha-adm/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/rocha-adm/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/rocha-adm/configuracoes", label: "Config", icon: Settings },
]

function NotificationBell() {
  const { unread } = useNotifications()
  return (
    <NavLink
      to="/rocha-adm/notificacoes"
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
  const { session, isResolving, logout } = useStaffSession()
  const location = useLocation()
  const outlet = useOutlet()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Wait for the real Supabase Auth session to be restored from storage
  // before deciding to bounce to /login — otherwise a refresh would always
  // show a flash of the login screen (or worse, kick out a valid session).
  if (isResolving) return null

  if (!session) {
    return <Navigate to="/rocha-adm/login" replace state={{ from: location.pathname }} />
  }

  return (
    <NotificationsProvider>
    <div className="min-h-svh bg-background">
      <header className="relative flex items-center justify-between border-b border-border px-6 py-4">
        <Link to="/rocha-adm/agenda">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
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
            className="hidden items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground md:flex"
          >
            <LogOut className="size-3.5" />
            Sair
          </button>
          {/* Hamburger — phones/tablets below md */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            className="flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent md:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute inset-x-0 top-full z-40 flex flex-col gap-1 border-b border-border bg-background p-3 shadow-lg md:hidden"
            >
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold tracking-wide uppercase transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )
                  }
                >
                  <Icon className="size-4" />
                  {label}
                </NavLink>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  logout()
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:bg-accent hover:text-foreground"
              >
                <LogOut className="size-4" />
                Sair · {session.barberName}
              </button>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
    </div>
    </NotificationsProvider>
  )
}
