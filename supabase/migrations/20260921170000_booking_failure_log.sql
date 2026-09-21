-- ============================================================================
-- Booking failure log
--
-- A failed booking used to leave no trace: the client saw an error, gave
-- up, and the shop only found out days later and second-hand ("fulano diz
-- que agendou e não apareceu") — with no way to check what actually
-- happened. This records each failed attempt so it can be looked up.
--
-- Only failures are recorded; successful bookings are already visible as
-- the appointment itself.
--
-- Privacy: the booking site runs unauthenticated, so anon must be able to
-- INSERT here — but these rows hold clients' names and phone numbers, so
-- anon must NOT be able to read them back. Insert-only for anon, read
-- restricted to staff.
-- ============================================================================

create table if not exists booking_failures (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  barber_id uuid references barbers(id) on delete set null,
  date date,
  start_time time,
  client_name text,
  client_phone text,
  error_message text,
  user_agent text
);

create index if not exists idx_booking_failures_occurred_at
  on booking_failures(occurred_at desc);

alter table booking_failures enable row level security;

drop policy if exists booking_failures_anon_insert on booking_failures;
create policy booking_failures_anon_insert
  on booking_failures for insert
  to anon, authenticated
  with check (true);

drop policy if exists booking_failures_staff_select on booking_failures;
create policy booking_failures_staff_select
  on booking_failures for select
  to authenticated
  using (is_staff());
