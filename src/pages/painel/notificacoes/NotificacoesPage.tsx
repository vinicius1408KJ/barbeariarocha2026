import { useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { BellOff, CalendarPlus, CalendarX } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/lib/notifications/NotificationsContext"

export function NotificacoesPage() {
  const { items, markAllRead } = useNotifications()

  // Opening the screen clears the unread badge.
  useEffect(() => {
    markAllRead()
  }, [markAllRead])

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <p className="mb-4 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        Notificações
      </p>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <BellOff className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n) => {
            const isCancel = n.type === "cancellation"
            const Icon = isCancel ? CalendarX : CalendarPlus
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3",
                  n.read ? "border-border bg-card" : "border-primary/30 bg-primary/[0.05]"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
                    isCancel
                      ? "bg-destructive/15 text-destructive"
                      : "bg-emerald-500/15 text-emerald-400"
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    {!n.read && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
