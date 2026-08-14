-- ============================================================================
-- Add server-side conflict check to the public booking RPC
--
-- create_public_appointment (used by the client-facing booking site) never
-- checked for an overlapping appointment/block before inserting — it
-- trusted the earlier getAvailableSlots read to have already filtered busy
-- times. That's not safe against a race: two clients loading the slot grid
-- within the same window can both see a slot as free and both submit, and
-- both inserts succeeded. Reported by a barber (Lucas): some clients could
-- book an already-full slot even with a packed agenda.
--
-- Fix: same overlap-check block already used in create_manual_appointment
-- (appointments + blocked_slots, excluding cancelled/no_show), run inside
-- the same function call as the insert. The thrown message surfaces as-is
-- to the client (ConfirmationPage.tsx already displays err.message and
-- offers "Tentar novamente"), so no frontend change was needed.
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
