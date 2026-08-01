-- ============================================================================
-- Fix complete_appointment for multi-service appointments
--
-- complete_appointment still did `join services s on s.id = a.service_id` to
-- get the service name for the transaction description. Since
-- create_public_appointment (previous migration) stopped writing
-- appointments.service_id, that column is now null for every new
-- appointment — the inner join returned zero rows, v_barber_id stayed null,
-- and the function raised "Appointment % not found" for every multi-service
-- appointment, even though the appointment clearly existed. Found by
-- clicking "Fechar comanda" in the real admin panel and getting that error.
--
-- Fix: look up the service name(s) via appointment_services first, falling
-- back to the legacy appointments.service_id join only for old rows that
-- still have it set (pre-migration history) and have no appointment_services
-- rows for some reason.
-- ============================================================================

create or replace function complete_appointment(
  p_appointment_id uuid,
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
  v_services_label text;
begin
  select a.barber_id into v_barber_id
    from appointments a
   where a.id = p_appointment_id;

  if v_barber_id is null then
    raise exception 'Appointment % not found', p_appointment_id;
  end if;

  select string_agg(s.name, ' + ' order by asvc.sort_order)
    into v_services_label
    from appointment_services asvc
    join services s on s.id = asvc.service_id
   where asvc.appointment_id = p_appointment_id;

  if v_services_label is null then
    select s.name into v_services_label
      from appointments a
      join services s on s.id = a.service_id
     where a.id = p_appointment_id;
  end if;

  update appointments
     set status = 'completed',
         price_paid_cents = p_amount_cents,
         payment_method = p_payment_method,
         completed_at = now(),
         completed_by_barber_id = v_barber_id
   where id = p_appointment_id;

  insert into transactions (sale_type, barber_id, appointment_id, description, amount_cents, payment_method, card_type, fee_cents)
  values ('servico', v_barber_id, p_appointment_id, coalesce(v_services_label, 'Serviço'), p_amount_cents, p_payment_method, p_card_type, coalesce(p_fee_cents, 0))
  on conflict (appointment_id) do update
    set amount_cents = excluded.amount_cents,
        payment_method = excluded.payment_method,
        card_type = excluded.card_type,
        fee_cents = excluded.fee_cents,
        occurred_at = now();
end;
$$;
