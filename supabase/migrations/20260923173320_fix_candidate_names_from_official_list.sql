-- Corrects the previous migration's candidate data against the Secretary of
-- the Commonwealth's official candidate list, which the user supplied after
-- that migration was written (it couldn't be fetched directly — see the
-- previous migration's header). Two kinds of fix:
--
-- 1. Full legal names where the earlier, secondary-sourced data had a
--    shortened or slightly different form.
-- 2. One real omission: Governor's Councillor (5th District) is NOT
--    unopposed. William Falcetano (R) is on the ballot; earlier research
--    reporting "no Republican candidate filed" was wrong or stale.

do $$
declare
  v_meetup_id bigint;
  v_race_id bigint;
begin
  select id into v_meetup_id from public.meetups where slug = 'ma-2026-general';
  if v_meetup_id is null then
    raise exception 'meetup ma-2026-general not found';
  end if;

  -- Name corrections (spelling/capitalization/full legal name).
  update public.candidates set name = 'Kari Della MacRae'
    where race_id in (select id from public.races where meetup_id = v_meetup_id)
    and name = 'Kari Della Macrae';

  update public.candidates set name = 'Kathleen LaNatra'
    where race_id in (select id from public.races where meetup_id = v_meetup_id)
    and name = 'Kathleen R. LaNatra';

  update public.candidates set name = 'Daniel James Kelly'
    where race_id in (select id from public.races where meetup_id = v_meetup_id)
    and name = 'Daniel Kelly';

  update public.candidates set name = 'Kenneth Peter Sweezey'
    where race_id in (select id from public.races where meetup_id = v_meetup_id)
    and name = 'Kenneth Sweezey';

  update public.candidates set name = 'Anthony Thomas O''Brien, Sr.'
    where race_id in (select id from public.races where meetup_id = v_meetup_id)
    and name = 'Anthony O''Brien';

  update public.candidates set name = 'Tamisha L. Civil'
    where race_id in (select id from public.races where meetup_id = v_meetup_id)
    and name = 'Tamisha Civil';

  update public.candidates set name = 'Francis T. Crimmins, Jr.'
    where race_id in (select id from public.races where meetup_id = v_meetup_id)
    and name = 'Francis Crimmins Jr.';

  update public.candidates set name = 'Paul M. DePalo'
    where race_id in (select id from public.races where meetup_id = v_meetup_id)
    and name = 'Paul DePalo';

  update public.candidates set name = 'Margaret M. Abboud'
    where race_id in (select id from public.races where meetup_id = v_meetup_id)
    and name = 'Margaret Abboud';

  -- Rename the Democratic incumbent to her full legal name too, and add her
  -- previously-missing Republican opponent.
  update public.candidates set name = 'Eunice Delice Zeigler'
    where race_id in (select id from public.races where meetup_id = v_meetup_id)
    and name = 'Eunice Zeigler';

  select id into v_race_id from public.races
    where meetup_id = v_meetup_id and name = 'Governor''s Councillor (5th District)';
  if v_race_id is null then
    raise exception 'Governor''s Councillor (5th District) race not found';
  end if;

  insert into public.candidates (race_id, name, party, sort_order)
  values (v_race_id, 'William Falcetano', 'Republican', 2);
end
$$;
