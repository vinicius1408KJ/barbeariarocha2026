import { supabase } from "@/lib/supabaseClient"

// Until now a failed booking left no trace anywhere: the client saw an
// error, gave up, and the shop only heard about it days later ("fulano diz
// que agendou e não apareceu"). This records the attempt so it can be
// looked up instead of guessed at.
//
// Deliberately fire-and-forget: logging must never delay the client's
// feedback, and a failure to log must never surface as a second error on
// top of the one they already hit.
export function logBookingFailure(input: {
  barberId?: string | null
  date?: string | null
  startTime?: string | null
  clientName?: string | null
  clientPhone?: string | null
  error: unknown
}): void {
  if (!supabase) return

  const message =
    input.error instanceof Error ? input.error.message : String(input.error ?? "erro desconhecido")

  void supabase
    .from("booking_failures")
    .insert({
      barber_id: input.barberId ?? null,
      date: input.date ?? null,
      start_time: input.startTime ?? null,
      client_name: input.clientName ?? null,
      client_phone: input.clientPhone ?? null,
      error_message: message.slice(0, 500),
      user_agent: navigator.userAgent.slice(0, 500),
    })
    .then(() => {})
}
