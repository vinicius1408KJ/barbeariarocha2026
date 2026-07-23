import { useCallback, useEffect, useRef, useState } from "react"
import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Scissors,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatPriceBRL } from "@/lib/utils"
import { adminRepository } from "@/lib/repository/adminRepository"
import { useStaffSession } from "@/lib/auth/StaffSessionContext"
import type { DateRange } from "@/lib/repository/adminTypes"
import { EXPENSE_CATEGORY_LABEL, SALE_TYPE_LABEL } from "@/lib/financeLabels"
import { PAYMENT_LABEL } from "@/lib/statusLabels"
import { exportPdf, exportXlsx } from "@/lib/export/exportReport"
import type { Barber, CashFlowBucket, DRE, ExpenseCategory, SaleType, Transaction } from "@/lib/types"

type BarberEarnings = { serviceRevenueCents: number; appointments: number; ticketAvgCents: number }

type Gran = "day" | "month" | "year"

const GRAN_LABEL: Record<Gran, string> = { day: "Dia", month: "Mês", year: "Ano" }

function rangeFor(gran: Gran, ref: Date): DateRange {
  if (gran === "day") {
    const d = format(ref, "yyyy-MM-dd")
    return { from: d, to: d }
  }
  if (gran === "month") {
    return { from: format(startOfMonth(ref), "yyyy-MM-dd"), to: format(endOfMonth(ref), "yyyy-MM-dd") }
  }
  return { from: format(startOfYear(ref), "yyyy-MM-dd"), to: format(endOfYear(ref), "yyyy-MM-dd") }
}

function shiftRef(gran: Gran, ref: Date, dir: 1 | -1): Date {
  if (gran === "day") return addDays(ref, dir)
  if (gran === "month") return addMonths(ref, dir)
  return addYears(ref, dir)
}

function periodLabel(gran: Gran, ref: Date): string {
  if (gran === "day") return format(ref, "dd/MM/yyyy")
  if (gran === "month") {
    const s = format(ref, "MMMM yyyy", { locale: ptBR })
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  return format(ref, "yyyy")
}

export function RelatoriosPage() {
  const { session } = useStaffSession()
  const [gran, setGran] = useState<Gran>("month")
  const [ref, setRef] = useState<Date>(new Date())
  const dateInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [dre, setDre] = useState<DRE | null>(null)
  const [cashFlow, setCashFlow] = useState<CashFlowBucket[]>([])
  const [earnings, setEarnings] = useState<BarberEarnings | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [barbers, setBarbers] = useState<Barber[]>([])
  const [forecast, setForecast] = useState<{
    subscriptionsMonthlyCents: number
    upcomingAppointmentsCents: number
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const range = rangeFor(gran, ref)
    const cfGran = gran === "year" ? "month" : "day"
    try {
      const [d, cf, fc, ea, txs, bbs] = await Promise.all([
        adminRepository.getDRE(range),
        adminRepository.getCashFlow(range, cfGran),
        adminRepository.getCashForecast(),
        adminRepository.getBarberEarnings(session!.barberId, range),
        adminRepository.listTransactions(range),
        adminRepository.listBarbers(),
      ])
      setDre(d)
      setCashFlow(cf)
      setForecast(fc)
      setEarnings(ea)
      setTransactions(txs)
      setBarbers(bbs)
    } finally {
      setLoading(false)
    }
  }, [gran, ref, session])

  useEffect(() => {
    load()
  }, [load])

  function exportDre(kind: "pdf" | "xlsx") {
    if (!dre) return
    const cols = [
      { header: "Item", key: "item" },
      { header: "Valor", key: "valor" },
    ]
    const rows = [
      ...(Object.entries(dre.revenueByType) as [SaleType, number][]).map(([k, v]) => ({
        item: `Receita · ${SALE_TYPE_LABEL[k]}`,
        valor: formatPriceBRL(v),
      })),
      { item: "Receita total", valor: formatPriceBRL(dre.revenueTotalCents) },
      ...(Object.entries(dre.expensesByCategory) as [ExpenseCategory, number][])
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ item: `Despesa · ${EXPENSE_CATEGORY_LABEL[k]}`, valor: formatPriceBRL(v) })),
      { item: "Despesas totais", valor: formatPriceBRL(dre.expensesTotalCents) },
      { item: "Taxas de cartão", valor: formatPriceBRL(dre.cardFeesTotalCents) },
      { item: "LUCRO", valor: formatPriceBRL(dre.profitCents) },
    ]
    const subtitle = `Período: ${periodLabel(gran, ref)}`
    if (kind === "pdf") exportPdf("DRE", subtitle, cols, rows)
    else exportXlsx("DRE", cols, rows)
  }

  const barberName = (id: string | null) =>
    id ? (barbers.find((b) => b.id === id)?.name ?? "") : ""

  // Derived figures for the profit hero + charts
  const costsCents = dre ? dre.expensesTotalCents + dre.cardFeesTotalCents : 0
  const marginPct =
    dre && dre.revenueTotalCents > 0
      ? Math.round((dre.profitCents / dre.revenueTotalCents) * 100)
      : 0
  const profitPositive = (dre?.profitCents ?? 0) >= 0

  const revenueRows = dre
    ? (Object.entries(dre.revenueByType) as [SaleType, number][])
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => ({ label: SALE_TYPE_LABEL[k], cents: v }))
    : []

  const expenseRows = dre
    ? (Object.entries(dre.expensesByCategory) as [ExpenseCategory, number][])
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => ({ label: EXPENSE_CATEGORY_LABEL[k], cents: v }))
    : []

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      {/* Granularity selector */}
      <div className="mb-3 flex gap-1 rounded-xl bg-card p-1">
        {(["day", "month", "year"] as Gran[]).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGran(g)}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-semibold tracking-wide uppercase transition-colors",
              gran === g ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            {GRAN_LABEL[g]}
          </button>
        ))}
      </div>

      {/* Period navigation */}
      <div className="mb-5 flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-2">
        <button
          type="button"
          onClick={() => setRef((r) => shiftRef(gran, r, -1))}
          aria-label="Anterior"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
        >
          <ChevronLeft className="size-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            const el = dateInputRef.current
            if (!el) return
            if (typeof el.showPicker === "function") {
              try {
                el.showPicker()
                return
              } catch {
                /* fall through */
              }
            }
            el.focus()
            el.click()
          }}
          className="flex flex-1 flex-col items-center rounded-lg py-1 transition-colors hover:bg-accent active:scale-[0.98]"
        >
          <span className="flex items-center gap-1.5 text-base font-semibold tracking-tight text-foreground">
            <CalendarDays className="size-4 text-primary" />
            {periodLabel(gran, ref)}
          </span>
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            escolher a data
          </span>
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={format(ref, "yyyy-MM-dd")}
          onChange={(e) => e.target.value && setRef(new Date(`${e.target.value}T00:00:00`))}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={() => setRef((r) => shiftRef(gran, r, 1))}
          aria-label="Próximo"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:scale-95"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {loading || !dre ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Personal earnings (only the logged-in barber's own service sales) */}
          {earnings && (
            <section>
              <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Meu faturamento · {session?.barberName}
              </p>
              <div className="rounded-2xl border border-primary/25 bg-primary/[0.07] p-5">
                <div className="flex items-center gap-2 text-primary">
                  <Scissors className="size-4" />
                  <span className="text-[11px] font-semibold tracking-wide uppercase">
                    {periodLabel(gran, ref)} · só o seu
                  </span>
                </div>
                <p className="mt-1 font-display text-4xl leading-none tracking-tight text-foreground tabular-nums">
                  {formatPriceBRL(earnings.serviceRevenueCents)}
                </p>
                <div className="mt-3 flex gap-6">
                  <div>
                    <p className="text-lg font-semibold text-foreground tabular-nums">
                      {earnings.appointments}
                    </p>
                    <p className="text-[11px] text-muted-foreground uppercase">
                      {earnings.appointments === 1 ? "atendimento" : "atendimentos"}
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground tabular-nums">
                      {formatPriceBRL(earnings.ticketAvgCents)}
                    </p>
                    <p className="text-[11px] text-muted-foreground uppercase">ticket médio</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Shop-wide result */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Barbearia · Lucro · {periodLabel(gran, ref)}
              </p>
              <div className="flex gap-1">
                <Button size="xs" variant="ghost" onClick={() => exportDre("pdf")}>
                  <Download className="size-3.5" />
                  PDF
                </Button>
                <Button size="xs" variant="ghost" onClick={() => exportDre("xlsx")}>
                  <FileSpreadsheet className="size-3.5" />
                  Excel
                </Button>
              </div>
            </div>

            <div
              className={cn(
                "overflow-hidden rounded-2xl border p-5",
                profitPositive
                  ? "border-emerald-500/25 bg-emerald-500/[0.07]"
                  : "border-destructive/30 bg-destructive/[0.07]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className={cn(
                      "font-display text-4xl leading-none tracking-tight tabular-nums",
                      profitPositive ? "text-emerald-400" : "text-destructive"
                    )}
                  >
                    {formatPriceBRL(dre.profitCents)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {profitPositive ? "Lucro" : "Prejuízo"} sobre receita de{" "}
                    <span className="font-medium text-foreground">
                      {formatPriceBRL(dre.revenueTotalCents)}
                    </span>
                  </p>
                </div>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                    profitPositive
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-destructive/15 text-destructive"
                  )}
                >
                  {profitPositive ? (
                    <TrendingUp className="size-3.5" />
                  ) : (
                    <TrendingDown className="size-3.5" />
                  )}
                  {marginPct}% margem
                </span>
              </div>

              {/* Receita vs custos comparison */}
              <div className="mt-5 flex flex-col gap-2.5">
                <CompareBar
                  label="Receita"
                  cents={dre.revenueTotalCents}
                  max={Math.max(dre.revenueTotalCents, costsCents, 1)}
                  barClass="bg-primary"
                />
                <CompareBar
                  label="Custos"
                  cents={costsCents}
                  max={Math.max(dre.revenueTotalCents, costsCents, 1)}
                  barClass="bg-rose-400"
                />
              </div>
            </div>

            {/* DRE detail */}
            <div className="mt-3 rounded-xl border border-border bg-card p-4 text-sm">
              <Row label="Receita total" value={formatPriceBRL(dre.revenueTotalCents)} />
              <Row label="Despesas" value={`− ${formatPriceBRL(dre.expensesTotalCents)}`} muted />
              <Row
                label="Taxas de cartão"
                value={`− ${formatPriceBRL(dre.cardFeesTotalCents)}`}
                muted
              />
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                <span className="text-sm font-semibold text-foreground">Lucro</span>
                <span
                  className={cn(
                    "text-base font-semibold",
                    profitPositive ? "text-emerald-400" : "text-destructive"
                  )}
                >
                  {formatPriceBRL(dre.profitCents)}
                </span>
              </div>
            </div>
          </section>

          {/* Revenue by type */}
          {revenueRows.length > 0 && (
            <section>
              <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Receita por tipo
              </p>
              <div className="rounded-xl border border-border bg-card p-4">
                <BarList
                  items={revenueRows}
                  max={Math.max(...revenueRows.map((r) => r.cents), 1)}
                  barClass="bg-primary"
                />
              </div>
            </section>
          )}

          {/* Expenses by category */}
          {expenseRows.length > 0 && (
            <section>
              <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Despesas por categoria
              </p>
              <div className="rounded-xl border border-border bg-card p-4">
                <BarList
                  items={expenseRows}
                  max={Math.max(...expenseRows.map((r) => r.cents), 1)}
                  barClass="bg-rose-400"
                />
              </div>
            </section>
          )}

          {/* Detailed list of everything sold in the period */}
          <section>
            <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              Atendimentos e vendas · {periodLabel(gran, ref)}
            </p>
            {transactions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                Nada registrado neste período.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {transactions.map((t) => {
                  const isProduct = t.saleType === "produto"
                  const who = t.saleType === "servico" ? barberName(t.barberId) : ""
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5"
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          isProduct
                            ? "bg-sky-500/15 text-sky-400"
                            : "bg-primary/15 text-primary"
                        )}
                      >
                        {isProduct ? (
                          <ShoppingBag className="size-4" />
                        ) : (
                          <Scissors className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {t.description}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {SALE_TYPE_LABEL[t.saleType]}
                          {who && ` · ${who}`} · {PAYMENT_LABEL[t.paymentMethod]} ·{" "}
                          {format(new Date(t.occurredAt), "dd/MM HH:mm")}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-primary tabular-nums">
                        {formatPriceBRL(t.amountCents)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Cash flow */}
          {cashFlow.some((b) => b.revenueCents > 0 || b.expenseCents > 0) && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                  Fluxo de caixa
                </p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-500" /> Entradas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-rose-500" /> Saídas
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                {(() => {
                  const max = Math.max(
                    ...cashFlow.map((x) => Math.max(x.revenueCents, x.expenseCents)),
                    1
                  )
                  return cashFlow.map((b) => (
                    <div key={b.period} className="mb-3 last:mb-0">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-muted-foreground">{b.period}</span>
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            b.netCents >= 0 ? "text-emerald-400" : "text-destructive"
                          )}
                        >
                          {formatPriceBRL(b.netCents)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${(b.revenueCents / max) * 100}%` }}
                          />
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-rose-500"
                            style={{ width: `${(b.expenseCents / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </section>
          )}

          {/* Forecast */}
          {forecast && (
            <section>
              <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Previsão de caixa
              </p>
              <div className="rounded-xl border border-primary/25 bg-primary/[0.06] p-4 text-sm">
                <Row
                  label="Assinaturas / mês"
                  value={formatPriceBRL(forecast.subscriptionsMonthlyCents)}
                />
                <Row
                  label="Agendamentos futuros"
                  value={formatPriceBRL(forecast.upcomingAppointmentsCents)}
                />
                <div className="mt-2 flex items-center justify-between border-t border-primary/20 pt-2">
                  <span className="text-sm font-semibold text-foreground">Previsto</span>
                  <span className="text-lg font-semibold text-primary">
                    {formatPriceBRL(
                      forecast.subscriptionsMonthlyCents + forecast.upcomingAppointmentsCents
                    )}
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium tabular-nums", muted ? "text-muted-foreground" : "text-foreground")}>
        {value}
      </span>
    </div>
  )
}

// Horizontal magnitude bars with direct value labels (single hue per chart).
function BarList({
  items,
  max,
  barClass,
}: {
  items: { label: string; cents: number }[]
  max: number
  barClass: string
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="truncate pr-2 text-muted-foreground">{it.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">
              {formatPriceBRL(it.cents)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full", barClass)}
              style={{ width: `${Math.max((it.cents / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// A labelled bar used to compare two totals (receita vs custos) on one scale.
function CompareBar({
  label,
  cents,
  max,
  barClass,
}: {
  label: string
  cents: number
  max: number
  barClass: string
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums text-foreground">{formatPriceBRL(cents)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full", barClass)}
          style={{ width: `${Math.max((cents / max) * 100, 2)}%` }}
        />
      </div>
    </div>
  )
}
