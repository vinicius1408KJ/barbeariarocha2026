import type { Barber, BusinessHours, Service } from "./types"

export const SEED_SERVICES: Service[] = [
  { id: "svc-barba", name: "Barba", durationMinutes: 30, priceCents: 3000, active: true, sortOrder: 0 },
  { id: "svc-corte-tesoura", name: "Corte na Tesoura", durationMinutes: 45, priceCents: 3500, active: true, sortOrder: 1 },
  { id: "svc-corte-social", name: "Corte Social", durationMinutes: 35, priceCents: 3000, active: true, sortOrder: 2 },
  { id: "svc-degrade-zero", name: "Degradê na Zero", durationMinutes: 45, priceCents: 3500, active: true, sortOrder: 3 },
  { id: "svc-degrade-navalhado", name: "Degradê Navalhado", durationMinutes: 50, priceCents: 4000, active: true, sortOrder: 4 },
  { id: "svc-sobrancelha", name: "Sobrancelha", durationMinutes: 15, priceCents: 1500, active: true, sortOrder: 5 },
]

export const SEED_BARBERS: Barber[] = [
  { id: "brb-lucas", name: "Lucas", chairNumber: 1, avatarUrl: null, active: true },
  { id: "brb-tiago", name: "Tiago", chairNumber: 2, avatarUrl: null, active: true },
]

// Applies to all barbers (barberId is undefined in local mode = shop default).
// Monday(1)-Saturday(6): 09:00-19:00, closed Sunday(0).
export const SEED_BUSINESS_HOURS: BusinessHours[] = [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  openTime: "09:00",
  closeTime: "19:00",
  slotGranularityMinutes: 15,
}))
