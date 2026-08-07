-- ============================================================================
-- Edit appointment time: barber sets both start AND end
--
-- The first version of update_appointment_time (20260804120000) took only a
-- start time and derived end_time from the services' total duration. Barbers
-- asked to also set the end time by hand (client ran long/short, custom
-- block), so end_time is now an explicit parameter instead of computed.
-- Same staff auth + conflict/block checks as before, plus a guard that the
-- end is after the start. The old single-arg signature is dropped.
-- ============================================================================

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

drop function if exists update_appointment_time(uuid, time);
