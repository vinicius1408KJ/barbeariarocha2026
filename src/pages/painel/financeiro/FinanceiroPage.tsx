import { useState } from "react"
import { cn } from "@/lib/utils"
import { ExpensesTab } from "./ExpensesTab"
import { CashTab } from "./CashTab"
import { SalesTab } from "./SalesTab"
import { ProductsTab } from "./ProductsTab"

type Tab = "despesas" | "caixa" | "vendas" | "produtos"

const TABS: { key: Tab; label: string }[] = [
  { key: "vendas", label: "Vendas" },
  { key: "produtos", label: "Produtos" },
  { key: "despesas", label: "Despesas" },
  { key: "caixa", label: "Caixa" },
]

export function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>("vendas")

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

      {tab === "vendas" && <SalesTab />}
      {tab === "produtos" && <ProductsTab />}
      {tab === "despesas" && <ExpensesTab />}
      {tab === "caixa" && <CashTab />}
    </div>
  )
}
