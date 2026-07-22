import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient"
import { localBookingRepository } from "./localRepository"
import { supabaseBookingRepository } from "./supabaseRepository"
import type { BookingRepository } from "./types"

const PROBE_TIMEOUT_MS = 2500

async function probeSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false

  try {
    const probe = supabase.from("services").select("id", { count: "exact", head: true })
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), PROBE_TIMEOUT_MS)
    )
    const { error } = await Promise.race([probe, timeout])
    return !error
  } catch {
    return false
  }
}

export async function resolveRepository(): Promise<BookingRepository> {
  const reachable = await probeSupabase()
  return reachable ? supabaseBookingRepository : localBookingRepository
}

export type { BookingRepository } from "./types"
