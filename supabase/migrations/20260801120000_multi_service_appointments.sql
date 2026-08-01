-- ============================================================================
-- Multi-service appointments
--
-- Replaces the single appointments.service_id column with a junction table
-- (appointment_services), so one appointment can cover N services (e.g.
-- haircut + beard) with a summed duration/price, instead of forcing a
-- second booking that often can't fit before closing time.
--
-- appointments.service_id is kept as a nullable legacy column (existing
-- rows only) — new code never writes or reads it. A future cleanup
-- migration can drop it once the app is confirmed to no longer reference it.
-- ============================================================================


-- ── 1. appointment_services junction table ─────────────────────────────────
-- appointments.service_id was NOT NULL — new code stops writing to it, so it
-- must become nullable or every new insert (which no longer sets it) fails.

alter table appointments alter column service_id drop not null;

create table if not exists appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  service_id uuid not null references services(id) on delete restrict,
  -- Price at booking time, so later service price changes don't rewrite
  -- history (mirrors how appointments.price_paid_cents already freezes the
  -- checkout total independent of today's service prices).
  price_cents_at_booking integer not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_appointment_services_appointment_id
  on appointment_services(appointment_id);
create index if not exists idx_appointment_services_service_id
  on appointment_services(service_id);

-- A client can't add the same service twice to one appointment.
create unique index if not exists uq_appointment_services_appt_service
  on appointment_services(appointment_id, service_id);


-- ── 2. Backfill from existing appointments.service_id ──────────────────────
-- price_cents_at_booking is backfilled from the service's *current* price
-- since per-booking price wasn't tracked before this migration — an
-- approximation for old rows only. All new rows get the real booking price.

insert into appointment_services (appointment_id, service_id, price_cents_at_booking, sort_order)
select a.id, a.service_id, coalesce(s.price_cents, 0), 0
from appointments a
join services s on s.id = a.service_id
where a.service_id is not null
on conflict (appointment_id, service_id) do nothing;


-- ── 3. walk_in_queue: single service_id -> service_ids array ───────────────

alter table walk_in_queue add column if not exists service_ids uuid[] not null default '{}';

update walk_in_queue
set service_ids = array[service_id]
where service_id is not null and service_ids = '{}';


-- ── 4. RLS ───────────────────────────────────────────────────────────────
-- Same trust level as appointments itself: staff can read, nobody gets a
-- direct write policy — all writes happen inside SECURITY DEFINER RPCs.

alter table appointment_services enable row level security;

create policy appointment_services_staff_select
  on appointment_services for select
  using (is_staff());


-- ── 5. create_public_appointment: multi-service signature ──────────────────
-- Real old body (single p_service_id), pulled live from pg_proc, kept here
-- verbatim as a comment for rollback:
--
-- CREATE OR REPLACE FUNCTION public.create_public_appointment(p_barber_id uuid, p_service_id uuid, p_date date, p_start_time time without time zone, p_client_name text, p_client_phone text)
--  RETURNS appointments
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- declare
--   v_duration int;
--   v_end_time time;
--   v_row public.appointments;
-- begin
--   select duration_minutes into v_duration from services where id = p_service_id;
--   if v_duration is null then
--     raise exception 'Serviço não encontrado.';
--   end if;
--
--   v_end_time := (p_start_time + make_interval(mins => v_duration))::time;
--
--   insert into appointments (
--     barber_id, service_id, client_name, client_phone, date, start_time, end_time, status
--   ) values (
--     p_barber_id, p_service_id, p_client_name,
--     regexp_replace(p_client_phone, '\D', '', 'g'),
--     p_date, p_start_time, v_end_time, 'scheduled'
--   )
--   returning * into v_row;
--
--   return v_row;
-- end;
-- $function$;

drop function if exists create_public_appointment(uuid, uuid, date, time, text, text);

create or replace function create_public_appointment(
  p_barber_id uuid,
  p_service_ids uuid[],
  p_date date,
  p_start_time time,
  p_client_name text,
  p_client_phone text
)
returns appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_minutes integer;
  v_end_time time;
  v_appointment appointments;
  v_service record;
begin
  if p_service_ids is null or array_length(p_service_ids, 1) is null then
    raise exception 'At least one service is required';
  end if;

  select coalesce(sum(duration_minutes), 0) into v_total_minutes
  from services
  where id = any(p_service_ids) and active = true;

  if v_total_minutes = 0 then
    raise exception 'Invalid or inactive services';
  end if;

  v_end_time := p_start_time + make_interval(mins => v_total_minutes);

  insert into appointments (
    barber_id, client_name, client_phone, date, start_time, end_time, status
  ) values (
    p_barber_id, p_client_name, regexp_replace(p_client_phone, '\D', '', 'g'),
    p_date, p_start_time, v_end_time, 'scheduled'
  )
  returning * into v_appointment;

  for v_service in
    select id, price_cents from services where id = any(p_service_ids)
  loop
    insert into appointment_services (appointment_id, service_id, price_cents_at_booking, sort_order)
    values (v_appointment.id, v_service.id, v_service.price_cents,
            array_position(p_service_ids, v_service.id));
  end loop;

  return v_appointment;
end;
$$;


-- ── 6. complete_walk_in: multi-service signature ────────────────────────────
-- Real body pulled live from pg_proc, kept here verbatim as a comment for rollback:
--
-- CREATE OR REPLACE FUNCTION public.complete_walk_in(p_walk_in_id uuid, p_service_id uuid, p_amount_cents integer, p_payment_method payment_method, p_card_type text DEFAULT NULL::text, p_fee_cents integer DEFAULT 0)
--  RETURNS void
--  LANGUAGE plpgsql
--  SET search_path TO 'public'
-- AS $function$
-- declare
--   v_barber_id uuid;
--   v_client_name text;
--   v_client_phone text;
--   v_service_name text;
--   v_duration int;
--   v_start time;
--   v_end time;
--   v_appt_id uuid;
-- begin
--   select w.barber_id, w.client_name, coalesce(w.client_phone, ''), w.arrived_at::time
--     into v_barber_id, v_client_name, v_client_phone, v_start
--     from walk_in_queue w
--    where w.id = p_walk_in_id;
--
--   if v_barber_id is null then
--     raise exception 'Walk-in % not found', p_walk_in_id;
--   end if;
--
--   select s.name, s.duration_minutes
--     into v_service_name, v_duration
--     from services s
--    where s.id = p_service_id;
--
--   if v_service_name is null then
--     raise exception 'Service % not found', p_service_id;
--   end if;
--
--   v_end := (v_start + make_interval(mins => coalesce(v_duration, 30)))::time;
--
--   insert into appointments (
--     barber_id, service_id, client_name, client_phone, date, start_time, end_time,
--     status, price_paid_cents, is_walk_in, payment_method, completed_at, completed_by_barber_id
--   )
--   values (
--     v_barber_id, p_service_id, v_client_name, v_client_phone, current_date, v_start, v_end,
--     'completed', p_amount_cents, true, p_payment_method, now(), v_barber_id
--   )
--   returning id into v_appt_id;
--
--   insert into transactions (sale_type, barber_id, appointment_id, description, amount_cents, payment_method, card_type, fee_cents)
--   values ('servico', v_barber_id, v_appt_id, v_service_name, p_amount_cents, p_payment_method, p_card_type, coalesce(p_fee_cents, 0));
--
--   update walk_in_queue
--      set status = 'done',
--          started_at = coalesce(started_at, now()),
--          resulting_appointment_id = v_appt_id
--    where id = p_walk_in_id;
-- end;
-- $function$;
--
-- Now with p_service_id -> p_service_ids uuid[]: duration/price summed
-- across all services, and the description written to transactions joins
-- every service name with " + ". v_start still comes from the walk-in's
-- arrived_at (not current_time) — preserved exactly as in the live function.

drop function if exists complete_walk_in(uuid, uuid, integer, payment_method, text, integer);

create or replace function complete_walk_in(
  p_walk_in_id uuid,
  p_service_ids uuid[],
  p_amount_cents integer,
  p_payment_method payment_method,
  p_card_type text default null,
  p_fee_cents integer default 0
)
returns void
language plpgsql
set search_path = 'public'
as $$
declare
  v_barber_id uuid;
  v_client_name text;
  v_client_phone text;
  v_services_label text;
  v_total_minutes int;
  v_start time;
  v_end time;
  v_appt_id uuid;
  v_service record;
begin
  select w.barber_id, w.client_name, coalesce(w.client_phone, ''), w.arrived_at::time
    into v_barber_id, v_client_name, v_client_phone, v_start
    from walk_in_queue w
   where w.id = p_walk_in_id;

  if v_barber_id is null then
    raise exception 'Walk-in % not found', p_walk_in_id;
  end if;

  if p_service_ids is null or array_length(p_service_ids, 1) is null then
    raise exception 'At least one service is required';
  end if;

  select coalesce(sum(duration_minutes), 0), string_agg(name, ' + ' order by sort_order)
    into v_total_minutes, v_services_label
    from services where id = any(p_service_ids);

  if v_total_minutes = 0 then
    raise exception 'Invalid services';
  end if;

  v_end := (v_start + make_interval(mins => v_total_minutes))::time;

  insert into appointments (
    barber_id, client_name, client_phone, date, start_time, end_time,
    status, price_paid_cents, is_walk_in, payment_method, completed_at, completed_by_barber_id
  )
  values (
    v_barber_id, v_client_name, v_client_phone, current_date, v_start, v_end,
    'completed', p_amount_cents, true, p_payment_method, now(), v_barber_id
  )
  returning id into v_appt_id;

  for v_service in
    select id, price_cents from services where id = any(p_service_ids)
  loop
    insert into appointment_services (appointment_id, service_id, price_cents_at_booking, sort_order)
    values (v_appt_id, v_service.id, v_service.price_cents,
            array_position(p_service_ids, v_service.id));
  end loop;

  insert into transactions (sale_type, barber_id, appointment_id, description, amount_cents, payment_method, card_type, fee_cents)
  values ('servico', v_barber_id, v_appt_id, v_services_label, p_amount_cents, p_payment_method, p_card_type, coalesce(p_fee_cents, 0));

  update walk_in_queue
     set status = 'done',
         started_at = coalesce(started_at, now()),
         resulting_appointment_id = v_appt_id
   where id = p_walk_in_id;
end;
$$;


-- ── 7. get_appointments_by_phone: embed services as jsonb ──────────────────
-- Real body pulled live from pg_proc, kept here verbatim as a comment for rollback:
--
-- CREATE OR REPLACE FUNCTION public.get_appointments_by_phone(p_phone text)
--  RETURNS SETOF appointments
--  LANGUAGE sql
--  STABLE SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
--   select * from public.appointments
--   where client_phone = regexp_replace(p_phone, '\D', '', 'g')
--   order by date, start_time;
-- $function$;
--
-- Switched to an explicit RETURNS TABLE (every existing appointments column,
-- unchanged) plus one new `services` jsonb column — same ownership guarantee
-- as before (still scoped by client_phone = p_phone), just also returning
-- each appointment's line items in the same round trip instead of requiring
-- a second query.

drop function if exists get_appointments_by_phone(text);

create or replace function get_appointments_by_phone(p_phone text)
returns table (
  id uuid,
  barber_id uuid,
  service_id uuid,
  client_name text,
  client_phone text,
  date date,
  start_time time,
  end_time time,
  status appointment_status,
  price_paid_cents integer,
  notes text,
  is_walk_in boolean,
  payment_method payment_method,
  completed_at timestamptz,
  completed_by_barber_id uuid,
  created_at timestamptz,
  reminder_sent_at timestamptz,
  services jsonb
)
language sql
stable
security definer
set search_path = 'public'
as $$
  select
    a.id, a.barber_id, a.service_id, a.client_name, a.client_phone, a.date,
    a.start_time, a.end_time, a.status, a.price_paid_cents, a.notes, a.is_walk_in,
    a.payment_method, a.completed_at, a.completed_by_barber_id, a.created_at, a.reminder_sent_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
        'service_id', asvc.service_id,
        'name', s.name,
        'duration_minutes', s.duration_minutes,
        'price_cents_at_booking', asvc.price_cents_at_booking
      ) order by asvc.sort_order)
      from appointment_services asvc
      join services s on s.id = asvc.service_id
      where asvc.appointment_id = a.id), '[]'::jsonb
    ) as services
  from appointments a
  where a.client_phone = regexp_replace(p_phone, '\D', '', 'g')
  order by a.date, a.start_time;
$$;
