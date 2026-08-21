-- ============================================================================
-- Close the remaining race window with an advisory lock
--
-- The earlier conflict check (20260805120000_add_conflict_check_to_public_
-- booking.sql) is still a "check-then-act": SELECT count(*) for conflicts,
-- then INSERT. Two truly simultaneous calls for the same barber/date can
-- both run their SELECT before either commits its INSERT, so both see "no
-- conflict" and both succeed. This is what happened to a client (Romerito)
-- who managed to book 16:00 with a barber who already had another client
-- (Kairo) at that exact time — reported by Lucas.
--
-- Fix: take a transaction-scoped advisory lock keyed on (barber_id, date)
-- at the top of each booking/edit function, before any conflict check.
-- Postgres advisory locks serialize automatically — a second concurrent
-- call for the same barber+date simply waits its turn (and correctly sees
-- the first call's row once it proceeds), closing the race entirely.
-- Applied to all three functions that can create/move an appointment:
-- create_public_appointment, create_manual_appointment,
-- update_appointment_time.
-- ============================================================================

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
  v_conflict_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_barber_id::text || p_date::text, 0));

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

  select count(*) into v_conflict_count
  from appointments a
  where a.barber_id = p_barber_id
    and a.date = p_date
    and a.status not in ('cancelled', 'no_show')
    and a.start_time < v_end_time
    and a.end_time > p_start_time;

  if v_conflict_count > 0 then
    raise exception 'Este horário já está ocupado. Escolha outro horário.';
  end if;

  select count(*) into v_conflict_count
  from blocked_slots b
  where b.barber_id = p_barber_id
    and b.date = p_date
    and b.start_time < v_end_time
    and b.end_time > p_start_time;

  if v_conflict_count > 0 then
    raise exception 'Este horário está indisponível. Escolha outro horário.';
  end if;

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

create or replace function create_manual_appointment(
  p_barber_id uuid,
  p_service_ids uuid[],
  p_date date,
  p_start_time time,
  p_client_name text,
  p_client_phone text default null
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
  v_conflict_count integer;
begin
  if not is_staff() then
    raise exception 'Not authorized';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_barber_id::text || p_date::text, 0));

  if p_client_name is null or length(trim(p_client_name)) < 2 then
    raise exception 'Client name is required';
  end if;

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

  select count(*) into v_conflict_count
  from appointments a
  where a.barber_id = p_barber_id
    and a.date = p_date
    and a.status not in ('cancelled', 'no_show')
    and a.start_time < v_end_time
    and a.end_time > p_start_time;

  if v_conflict_count > 0 then
    raise exception 'Este horário já está ocupado por outro agendamento.';
  end if;

  select count(*) into v_conflict_count
  from blocked_slots b
  where b.barber_id = p_barber_id
    and b.date = p_date
    and b.start_time < v_end_time
    and b.end_time > p_start_time;

  if v_conflict_count > 0 then
    raise exception 'Este horário está bloqueado.';
  end if;

  insert into appointments (
    barber_id, client_name, client_phone, date, start_time, end_time, status
  ) values (
    p_barber_id, trim(p_client_name),
    coalesce(regexp_replace(p_client_phone, '\D', '', 'g'), ''),
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

create or replace function update_appointment_time(
  p_appointment_id uuid,
  p_start_time time,
  p_end_time time
)
returns appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barber_id uuid;
  v_date date;
  v_appointment appointments;
  v_conflict_count integer;
begin
  if not is_staff() then
    raise exception 'Not authorized';
  end if;

  if p_end_time <= p_start_time then
    raise exception 'O horário final deve ser após o inicial.';
  end if;

  select barber_id, date into v_barber_id, v_date
  from appointments where id = p_appointment_id;

  if v_barber_id is null then
    raise exception 'Appointment not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_barber_id::text || v_date::text, 0));

  select count(*) into v_conflict_count
  from appointments a
  where a.barber_id = v_barber_id
    and a.date = v_date
    and a.id != p_appointment_id
    and a.status not in ('cancelled', 'no_show')
    and a.start_time < p_end_time
    and a.end_time > p_start_time;

  if v_conflict_count > 0 then
    raise exception 'Este horário já está ocupado por outro agendamento.';
  end if;

  select count(*) into v_conflict_count
  from blocked_slots b
  where b.barber_id = v_barber_id
    and b.date = v_date
    and b.start_time < p_end_time
    and b.end_time > p_start_time;

  if v_conflict_count > 0 then
    raise exception 'Este horário está bloqueado.';
  end if;

  update appointments
     set start_time = p_start_time, end_time = p_end_time
   where id = p_appointment_id
  returning * into v_appointment;

  return v_appointment;
end;
$$;
