-- ============================================================================
-- Manual admin-created appointment
--
-- Lets a barber, from the admin panel, create a genuine scheduled
-- appointment for a client at a specific date/time slot (client called in,
-- or staff wants to reserve ahead) — same semantics as create_public_appointment
-- (real start_time/end_time, shows in the Agenda timeline, can be completed
-- via "Fechar comanda"), but usable from an authenticated staff session and
-- with a server-side overlap check, since staff aren't limited to only the
-- slots the client-facing UI chooses to render.
-- ============================================================================

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

  -- Overlap check against existing (non-cancelled) appointments for this
  -- barber/date — the public booking flow only ever sends a slot the client
  -- UI already filtered as free, but a staff session can call this RPC
  -- directly, so the guard has to live here too.
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

  -- Same check against manual time blocks (lunch, break, etc.).
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
