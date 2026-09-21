import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient"
import { supabaseBookingRepository } from "./supabaseRepository"
import type { BookingRepository } from "./types"

// 2.5s was far too tight for a cold connection on mobile data: a client on
// weak 4G (or opening the site from inside WhatsApp's browser) would lose
// the race, silently fall back to the local repository, and get a fake
// "AGENDADO!" for a booking that only ever existed in their own phone.
const PROBE_TIMEOUT_MS = 8000
const PROBE_ATTEMPTS = 2

async function probeSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false

  for (let attempt = 1; attempt <= PROBE_ATTEMPTS; attempt++) {
    try {
      const probe = supabase.from("services").select("id", { count: "exact", head: true })
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), PROBE_TIMEOUT_MS)
      )
      const { error } = await Promise.race([probe, timeout])
      if (!error) return true
    } catch {
      // fall through to the next attempt
    }
  }
  return false
}

// null = database unreachable in production; callers must show an error
// instead of silently accepting bookings that go nowhere.
export async function resolveRepository(): Promise<BookingRepository | null> {
  const reachable = await probeSupabase()
  if (reachable) return supabaseBookingRepository

  // Falling back to localStorage in production means confirming bookings
  // that never reach the database — the client sees "AGENDADO!", the barber
  // never sees the appointment. Better to surface the connection failure
  // than to lie: the booking pages turn this into a "sem conexão" message.
  //
  // Imported dynamically so the dev-only repository and its fictional seed
  // catalog are tree-shaken out of the production bundle entirely, rather
  // than merely going unused.
  if (import.meta.env.PROD) return null
  const { localBookingRepository } = await import("./localRepository")
  return localBookingRepository
}

export type { BookingRepository } from "./types"
