-- ============================================================================
-- Free the slot when a client no-shows
--
-- The public availability view (appointment_slots, which the client booking
-- site reads to decide which times are taken) previously only excluded
-- 'cancelled' appointments. But the admin panel's only "remove" action is
-- "Faltou" (no_show) — there is no separate cancel button — so a no-showed
-- appointment kept its slot marked busy forever, and the freed time never
-- reopened on the booking site. Reported by a barber (Tiago) in production.
--
-- Fix: exclude 'no_show' from the view too, so a no-showed slot reopens for
-- booking exactly like a cancellation. The no_show row itself stays in the
-- appointments table for reporting/history.
-- ============================================================================

create or replace view appointment_slots as
  select id, barber_id, date, start_time, end_time, status
  from appointments
  where status <> 'cancelled'::appointment_status
    and status <> 'no_show'::appointment_status;
