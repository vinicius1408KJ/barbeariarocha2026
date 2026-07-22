import { createContext, useContext, useState, type ReactNode } from "react"
import { adminRepository } from "@/lib/repository/adminRepository"

export type StaffSession = {
  barberId: string
  barberName: string
  loginAt: string
}

const SESSION_KEY = "br_staff_session"

function loadSession(): StaffSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as StaffSession) : null
  } catch {
    return null
  }
}

type StaffSessionContextValue = {
  session: StaffSession | null
  login: (barberId: string, barberName: string, pin: string) => Promise<boolean>
  logout: () => void
}

const StaffSessionContext = createContext<StaffSessionContextValue | null>(null)

export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(loadSession)

  async function login(barberId: string, barberName: string, pin: string): Promise<boolean> {
    const ok = await adminRepository.verifyPin(barberId, pin)
    if (!ok) return false
    const next: StaffSession = { barberId, barberName, loginAt: new Date().toISOString() }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
    setSession(next)
    return true
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  return (
    <StaffSessionContext.Provider value={{ session, login, logout }}>
      {children}
    </StaffSessionContext.Provider>
  )
}

export function useStaffSession(): StaffSessionContextValue {
  const ctx = useContext(StaffSessionContext)
  if (!ctx) throw new Error("useStaffSession deve ser usado dentro de StaffSessionProvider")
  return ctx
}
