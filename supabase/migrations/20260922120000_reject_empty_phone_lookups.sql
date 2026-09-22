-- ============================================================================
-- Refuse phone-scoped lookups when the phone is empty
--
-- The phone number is what identifies a client across appointments, and
-- roughly a quarter of appointments were created with it blank (the panel's
-- "Agendar" form left the field optional). An empty phone therefore matched
-- every other phone-less appointment, silently merging ~75 different people
-- into a single identity:
--
--   * get_appointments_by_phone('') returned 163 strangers' appointments,
--     complete with names and phone numbers — and each one was cancellable
--     through cancel_own_appointment with the same empty phone
--   * the panel showed one client the merged history of all of them
--     (reported as "119ª visita · Gastou R$ 4.744" on a client whose real
--     history is a handful of visits)
--
-- No phone means no identifiable client, so every phone-scoped lookup now
-- refuses an empty value instead of matching everyone. The matching guard
-- for the panel's client-history card lives in adminRepository's
-- getClientHistory, which is a direct query rather than an RPC.
-- ============================================================================

create or replace function get_appointments_by_phone(p_phone text)
returns table (
  id uuid, barber_id uuid, service_id uuid, client_name text, client_phone text,
  date date, start_time time, end_time time, status appointment_status,
  price_paid_cents integer, notes text, is_walk_in boolean,
  payment_method payment_method, completed_at timestamptz,
  completed_by_barber_id uuid, created_at timestamptz,
  reminder_sent_at timestamptz, services jsonb
)
language sql stable security definer set search_path = 'public'
as $$
  select
    a.id, a.barber_id, a.service_id, a.client_name, a.client_phone, a.date,
    a.start_time, a.end_time, a.status, a.price_paid_cents, a.notes, a.is_walk_in,
    a.payment_method, a.completed_at, a.completed_by_barber_id, a.created_at,
    a.reminder_sent_at,
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
  where nullif(regexp_replace(p_phone, '\D', '', 'g'), '') is not null
    and a.client_phone = regexp_replace(p_phone, '\D', '', 'g')
  order by a.date, a.start_time;
$$;

create or replace function cancel_own_appointment(p_appointment_id uuid, p_phone text)
returns void language plpgsql security definer set search_path = 'public'
as $$
begin
  if nullif(regexp_replace(p_phone, '\D', '', 'g'), '') is null then
    raise exception 'Agendamento não encontrado para este telefone.';
  end if;

  update public.appointments
     set status = 'cancelled'
   where id = p_appointment_id
     and client_phone = regexp_replace(p_phone, '\D', '', 'g')
     and status in ('scheduled','confirmed');

  if not found then
    raise exception 'Agendamento não encontrado para este telefone.';
  end if;
end;
$$;

create or replace function get_reviews_by_phone(p_phone text)
returns setof reviews language sql stable security definer set search_path = 'public'
as $$
  select r.* from public.reviews r
  join public.appointments a on a.id = r.appointment_id
  where nullif(regexp_replace(p_phone, '\D', '', 'g'), '') is not null
    and a.client_phone = regexp_replace(p_phone, '\D', '', 'g');
$$;

create or replace function submit_review(p_appointment_id uuid, p_phone text, p_rating integer, p_comment text)
returns void language plpgsql security definer set search_path = 'public'
as $$
declare
  v_barber_id uuid;
begin
  if nullif(regexp_replace(p_phone, '\D', '', 'g'), '') is null then
    raise exception 'Agendamento não encontrado ou ainda não concluído.';
  end if;

  select barber_id into v_barber_id
    from appointments
   where id = p_appointment_id
     and client_phone = regexp_replace(p_phone, '\D', '', 'g')
     and status = 'completed';

  if v_barber_id is null then
    raise exception 'Agendamento não encontrado ou ainda não concluído.';
  end if;

  insert into reviews (appointment_id, barber_id, rating, comment)
  values (p_appointment_id, v_barber_id, p_rating, p_comment)
  on conflict (appointment_id) do update
    set rating = excluded.rating, comment = excluded.comment;
end;
$$;
