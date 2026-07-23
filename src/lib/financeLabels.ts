import type { CardType, CashMovementType, ExpenseCategory, SaleType } from "@/lib/types"

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  aluguel: "Aluguel",
  utilidades: "Energia / Água / Internet",
  produtos: "Produtos",
  marketing: "Marketing",
  manutencao: "Manutenção de máquinas",
  impostos: "Impostos / Contador",
  outros: "Outros",
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "aluguel",
  "utilidades",
  "produtos",
  "marketing",
  "manutencao",
  "impostos",
  "outros",
]

export const SALE_TYPE_LABEL: Record<SaleType, string> = {
  servico: "Serviço",
  produto: "Produto",
  assinatura: "Assinatura / Clube",
}

export const CASH_MOVEMENT_LABEL: Record<CashMovementType, string> = {
  sangria: "Sangria",
  suprimento: "Suprimento",
}

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  debito: "Débito",
  credito_vista: "Crédito à vista",
  credito_parcelado: "Crédito parcelado",
}

export const CARD_TYPES: CardType[] = ["debito", "credito_vista", "credito_parcelado"]
