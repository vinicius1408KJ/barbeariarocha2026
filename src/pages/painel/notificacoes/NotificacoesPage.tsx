import { useEffect } from "react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { BellOff, CalendarPlus, CalendarX, MessageCircle, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/lib/notifications/NotificationsContext"
import type { AppNotification } from "@/lib/types"

function waLink(n: AppNotification): string | null {
  if (!n.waPhone) return null
  return `https://wa.me/${n.waPhone}?text=${encodeURIComponent(n.waMessage ?? "")}`
}

export function NotificacoesPage() {
  const { items, markAllRead, deleteOne, clearAll } = useNotifications()

  // Opening the screen clears the unread badge.
  useEffect(() => {
    markAllRead()
  }, [markAllRead])

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
          Notificações
        </p>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            Limpar tudo
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <BellOff className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Nenhuma notificação por aqui.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n) => {
            const isCancel = n.type === "cancellation"
            const isReminder = n.type === "reminder"
            const Icon = isCancel ? CalendarX : isReminder ? MessageCircle : CalendarPlus
            const link = waLink(n)
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
                      : isReminder
                        ? "bg-[#25D366]/15 text-[#25D366]"
                        : "bg-emerald-500/15 text-emerald-400"
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      {!n.read && <span className="size-2 rounded-full bg-primary" />}
                      <button
                        type="button"
                        onClick={() => deleteOne(n.id)}
                        aria-label="Apagar notificação"
                        className="flex size-6 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                  </p>

                  {isReminder && link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
                    >
                      <MessageCircle className="size-3.5" />
                      Enviar no WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
