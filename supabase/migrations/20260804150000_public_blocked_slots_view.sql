-- ============================================================================
-- Public view for manual time blocks
--
-- Bug: manually-blocked times still showed as available on the client
-- booking site — clients could book right over a barber's block. Cause:
-- blocked_slots has only a staff-only RLS policy (ALL to authenticated +
-- is_staff()), so the anon client's SELECT returned nothing and the
-- availability calc saw no blocks.
--
-- Fix (mirrors the appointment_slots pattern): a public view exposing only
-- the timing columns — deliberately NOT 'reason', which can be private
-- (e.g. "médico", "folga") — readable by anon/authenticated for the site's
-- availability check. The base table stays staff-only.
-- ============================================================================

create or replace view blocked_slots_public as
  select barber_id, date, start_time, end_time
  from blocked_slots;

grant select on blocked_slots_public to anon, authenticated;
