-- Corrects three State Representative race links against Ballotpedia's own
-- "Massachusetts House of Representatives elections, 2026" hub page (saved
-- locally as ballotpedia/house.html, not checked in), which the previous
-- migration flagged as unverified: it picked between multiple URLs
-- Ballotpedia has for the same district (spelled-out vs. numeral ordinals)
-- by trusting a search result's title match, which turned out wrong for
-- three of the seven House districts. The hub page settles this
-- unambiguously — it only ever links the numeral form for every district on
-- this ballot, with no spelled-out variant appearing anywhere on the page.
--
-- The other four House districts (2nd Essex, 5th Plymouth, 6th Plymouth,
-- 9th Norfolk) already had the correct, numeral-form URL and are unchanged.
--
-- Senate races and Plymouth County Commissioner still aren't sourced from an
-- authoritative Ballotpedia listing the same way — ballotpedia/senate.html,
-- which should be this migration's counterpart for the Senate races, was
-- saved empty (0 bytes).

do $$
declare
  v_meetup_id bigint;
begin
  select id into v_meetup_id from public.meetups where slug = 'ma-2026-general';
  if v_meetup_id is null then
    raise exception 'meetup ma-2026-general not found';
  end if;

  update public.races set ballotpedia_url = v.url
  from (values
    ('State Representative (12th Plymouth District)', 'https://ballotpedia.org/Massachusetts_House_of_Representatives_12th_Plymouth_District'),
    ('State Representative (20th Middlesex District)', 'https://ballotpedia.org/Massachusetts_House_of_Representatives_20th_Middlesex_District'),
    ('State Representative (9th Essex District)', 'https://ballotpedia.org/Massachusetts_House_of_Representatives_9th_Essex_District')
  ) as v(name, url)
  where public.races.meetup_id = v_meetup_id
    and public.races.name = v.name;
end
$$;
