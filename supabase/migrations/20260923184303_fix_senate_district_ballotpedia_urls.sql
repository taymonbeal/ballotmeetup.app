-- Corrects the State Senator (Middlesex & Worcester District) race link
-- against Ballotpedia's own "Massachusetts State Senate elections, 2026" hub
-- page (saved locally as ballotpedia/senate.html, not checked in). It only
-- ever links "Middlesex_and_Worcester_District" (spelled "and"); the
-- previous migration had "Middlesex_&_Worcester_District" (an "&" form that
-- doesn't appear anywhere on the hub page), picked from a search result the
-- same unverified way the House district links were.
--
-- The other two Senate races on this ballot (Plymouth & Barnstable, 2nd
-- Essex & Middlesex) already had the URL the hub page confirms and are
-- unchanged.

do $$
declare
  v_meetup_id bigint;
begin
  select id into v_meetup_id from public.meetups where slug = 'ma-2026-general';
  if v_meetup_id is null then
    raise exception 'meetup ma-2026-general not found';
  end if;

  update public.races
  set ballotpedia_url = 'https://ballotpedia.org/Massachusetts_State_Senate_Middlesex_and_Worcester_District'
  where meetup_id = v_meetup_id
    and name = 'State Senator (Middlesex & Worcester District)';
end
$$;
