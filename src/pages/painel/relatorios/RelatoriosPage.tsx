import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { Download, FileSpreadsheet, TrendingDown, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatPriceBRL } from "@/lib/utils"
import { adminRepository } from "@/lib/repository/adminRepository"
import type { DateRange } from "@/lib/repository/adminTypes"
import { EXPENSE_CATEGORY_LABEL, SALE_TYPE_LABEL } from "@/lib/financeLabels"
import { exportPdf, exportXlsx } from "@/lib/export/exportReport"
import type {
  CashFlowBucket,
  CommissionSummary,
  DRE,
  ExpenseCategory,
  SaleType,
} from "@/lib/types"

type Period = "day" | "week" | "month"

function rangeFor(period: Period): DateRange {
  const now = new Date()
  if (period === "day") {
    const d = format(now, "yyyy-MM-dd")
    return { from: d, to: d }
  }
  if (period === "week") {
    const day = now.getDay()
    const start = new Date(now)
    start.setDate(now.getDate() - day)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") }
  }
  return {
    from: format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"),
    to: format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd"),
  }
}

const PERIOD_LABEL: Record<Period, string> = { day: "Dia", week: "Semana", month: "Mês" }

export function RelatoriosPage() {
  const [period, setPeriod] = useState<Period>("month")
  const [loading, setLoading] = useState(true)
  const [dre, setDre] = useState<DRE | null>(null)
  const [cashFlow, setCashFlow] = useState<CashFlowBucket[]>([])
  const [commissions, setCommissions] = useState<CommissionSummary[]>([])
  const [forecast, setForecast] = useState<{
    subscriptionsMonthlyCents: number
    upcomingAppointmentsCents: number
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const range = rangeFor(period)
    try {
      const [d, cf, com, fc] = await Promise.all([
        adminRepository.getDRE(range),
        adminRepository.getCashFlow(range, "day"),
        adminRepository.getCommissions(range),
        adminRepository.getCashForecast(),
      ])
      setDre(d)
      setCashFlow(cf)
      setCommissions(com)
      setForecast(fc)
    } finally {
      setLoading(false)
    }
  }, [period])

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
      { item: "Comissões", valor: formatPriceBRL(dre.commissionsTotalCents) },
      { item: "Taxas de cartão", valor: formatPriceBRL(dre.cardFeesTotalCents) },
      { item: "LUCRO", valor: formatPriceBRL(dre.profitCents) },
    ]
    const subtitle = `Período: ${PERIOD_LABEL[period]}`
    if (kind === "pdf") exportPdf("DRE", subtitle, cols, rows)
    else exportXlsx("DRE", cols, rows)
  }

  // Derived figures for the profit hero + charts
  const costsCents = dre
    ? dre.expensesTotalCents + dre.commissionsTotalCents + dre.cardFeesTotalCents
    : 0
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
      {/* Period selector */}
      <div className="mb-5 flex gap-1 rounded-xl bg-card p-1">
        {(["day", "week", "month"] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-semibold tracking-wide uppercase transition-colors",
              period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      {loading || !dre ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Profit hero */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
                Lucro do {PERIOD_LABEL[period].toLowerCase()}
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
              <Row label="Comissões" value={`− ${formatPriceBRL(dre.commissionsTotalCents)}`} muted />
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

          {/* Commissions */}
          <section>
            <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
              Comissões por barbeiro
            </p>
            <div className="flex flex-col gap-2">
              {commissions.map((c) => (
                <div
                  key={c.barberId}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.barberName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatPriceBRL(c.serviceRevenueCents)} × {c.commissionRatePercent}%
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {formatPriceBRL(c.commissionCents)}
                  </span>
                </div>
              ))}
            </div>
          </section>

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
