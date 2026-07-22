import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabaseClient"
import { adminRepository } from "@/lib/repository/adminRepository"
import { useStaffSession } from "@/lib/auth/StaffSessionContext"
import type { AppNotification } from "@/lib/types"

type NotificationsContextValue = {
  items: AppNotification[]
  unread: number
  refresh: () => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useStaffSession()
  const barberId = session?.barberId ?? null
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const seenIds = useRef<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (!barberId) return
    try {
      const [list, count] = await Promise.all([
        adminRepository.listNotifications(barberId),
        adminRepository.getUnreadNotificationCount(barberId),
      ])
      seenIds.current = new Set(list.map((n) => n.id))
      setItems(list)
      setUnread(count)
    } catch {
      // Silent: notifications are non-critical; a failed load just shows none.
    }
  }, [barberId])

  const markAllRead = useCallback(async () => {
    if (!barberId) return
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
    try {
      await adminRepository.markNotificationsRead(barberId)
    } catch {
      refresh()
    }
  }, [barberId, refresh])

  useEffect(() => {
    if (!barberId) {
      setItems([])
      setUnread(0)
      return
    }
    refresh()

    const client = supabase
    if (!client) return
    const channel = client
      .channel(`notifications:${barberId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `barber_id=eq.${barberId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const n = payload.new as { id: string; title: string; body: string }
            if (seenIds.current.has(n.id)) return
            toast(n.title, { description: n.body })
          }
          refresh()
        }
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [barberId, refresh])

  return (
    <NotificationsContext.Provider value={{ items, unread, refresh, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error("useNotifications deve ser usado dentro de NotificationsProvider")
  return ctx
}
