import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { adminRepository } from "@/lib/repository/adminRepository"
import { supabase } from "@/lib/supabaseClient"

export type StaffSession = {
  barberId: string
  barberName: string
}

type StaffSessionContextValue = {
  session: StaffSession | null
  // null while the real Supabase Auth session is still being resolved on
  // first load — callers should avoid redirecting to /login until this
  // settles, otherwise a real logged-in barber gets bounced on refresh.
  isResolving: boolean
  login: (barberId: string, barberName: string, authEmail: string, pin: string) => Promise<boolean>
  logout: () => void
}

const StaffSessionContext = createContext<StaffSessionContextValue | null>(null)

export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(null)
  const [isResolving, setIsResolving] = useState(true)
  const [pendingName, setPendingName] = useState<Record<string, string>>({})

  // Mirrors the real Supabase Auth session — a signed, server-verified JWT,
  // not a client-side flag. Restores on refresh and reacts to sign-out from
  // anywhere (e.g. token expiry).
  useEffect(() => {
    if (!supabase) {
      setIsResolving(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session?.user.user_metadata?.barber_id, data.session?.user.id)
      setIsResolving(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, authSession) => {
      applySession(authSession?.user.user_metadata?.barber_id, authSession?.user.id)
    })

    function applySession(barberId: unknown, userId: string | undefined) {
      if (typeof barberId === "string") {
        setSession((prev) => ({
          barberId,
          barberName: prev?.barberId === barberId ? prev.barberName : (pendingName[barberId] ?? ""),
        }))
      } else if (!userId) {
        setSession(null)
      }
    }

    return () => sub.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(
    barberId: string,
    barberName: string,
    authEmail: string,
    pin: string
  ): Promise<boolean> {
    const ok = await adminRepository.verifyPin(authEmail, pin)
    if (!ok) return false
    setPendingName((prev) => ({ ...prev, [barberId]: barberName }))
    setSession({ barberId, barberName })
    return true
  }

  function logout() {
    adminRepository.logout()
    setSession(null)
  }

  return (
    <StaffSessionContext.Provider value={{ session, isResolving, login, logout }}>
      {children}
    </StaffSessionContext.Provider>
  )
}

export function useStaffSession(): StaffSessionContextValue {
  const ctx = useContext(StaffSessionContext)
  if (!ctx) throw new Error("useStaffSession deve ser usado dentro de StaffSessionProvider")
  return ctx
}
