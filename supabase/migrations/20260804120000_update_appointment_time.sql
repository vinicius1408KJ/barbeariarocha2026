-- ============================================================================
-- Update appointment time
--
-- Lets a barber, from the admin panel, move an existing scheduled appointment
-- to a different start time on the same day (client running late, needs to
-- shift within the day, etc.) — same conflict-checking discipline as
-- create_manual_appointment (supabase/migrations/20260803120000_manual_admin_appointment.sql),
-- just excluding the appointment being edited from its own overlap check.
-- Services/duration are unchanged — only start_time (and the derived
-- end_time) move.
-- ============================================================================

create or replace function update_appointment_time(
  p_appointment_id uuid,
  p_start_time time
)
returns appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barber_id uuid;
  v_date date;
  v_total_minutes integer;
  v_end_time time;
  v_appointment appointments;
  v_conflict_count integer;
begin
  if not is_staff() then
    raise exception 'Not authorized';
  end if;

  select barber_id, date into v_barber_id, v_date
  from appointments where id = p_appointment_id;

  if v_barber_id is null then
    raise exception 'Appointment not found';
  end if;

  select coalesce(sum(s.duration_minutes), 0) into v_total_minutes
  from appointment_services asvc
  join services s on s.id = asvc.service_id
  where asvc.appointment_id = p_appointment_id;

  if v_total_minutes = 0 then
    raise exception 'Appointment has no services';
  end if;

  v_end_time := p_start_time + make_interval(mins => v_total_minutes);

  select count(*) into v_conflict_count
  from appointments a
  where a.barber_id = v_barber_id
    and a.date = v_date
    and a.id != p_appointment_id
    and a.status not in ('cancelled', 'no_show')
    and a.start_time < v_end_time
    and a.end_time > p_start_time;

  if v_conflict_count > 0 then
    raise exception 'Este horário já está ocupado por outro agendamento.';
  end if;

  select count(*) into v_conflict_count
  from blocked_slots b
  where b.barber_id = v_barber_id
    and b.date = v_date
    and b.start_time < v_end_time
    and b.end_time > p_start_time;

  if v_conflict_count > 0 then
    raise exception 'Este horário está bloqueado.';
  end if;

  update appointments
     set start_time = p_start_time, end_time = v_end_time
   where id = p_appointment_id
  returning * into v_appointment;

  return v_appointment;
end;
$$;
