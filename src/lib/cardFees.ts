import type { CardFees, CardType } from "@/lib/types"

// Percentage configured for a given card sub-type.
export function cardFeePercent(fees: CardFees, cardType: CardType): number {
  switch (cardType) {
    case "debito":
      return fees.debitoPercent
    case "credito_vista":
      return fees.creditoVistaPercent
    case "credito_parcelado":
      return fees.creditoParceladoPercent
  }
}

// Fee in cents for an amount paid with a given card sub-type (rounded).
export function cardFeeCents(fees: CardFees, cardType: CardType, amountCents: number): number {
  return Math.round((amountCents * cardFeePercent(fees, cardType)) / 100)
}
