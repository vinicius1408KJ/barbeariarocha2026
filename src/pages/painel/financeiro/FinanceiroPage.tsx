import { useState } from "react"
import { cn } from "@/lib/utils"
import { ExpensesTab } from "./ExpensesTab"
import { CashTab } from "./CashTab"
import { SalesTab } from "./SalesTab"

type Tab = "despesas" | "caixa" | "vendas"

const TABS: { key: Tab; label: string }[] = [
  { key: "despesas", label: "Despesas" },
  { key: "vendas", label: "Vendas" },
  { key: "caixa", label: "Caixa" },
]

export function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>("despesas")

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <div className="mb-5 flex gap-1 rounded-xl bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-semibold tracking-wide uppercase transition-colors",
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "despesas" && <ExpensesTab />}
      {tab === "vendas" && <SalesTab />}
      {tab === "caixa" && <CashTab />}
    </div>
  )
}
