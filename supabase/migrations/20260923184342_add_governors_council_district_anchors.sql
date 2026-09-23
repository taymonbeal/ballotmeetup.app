-- Applies the #District_N anchors added by hand to the Governor's Council
-- URLs in the migration that first set them (20260923175506). That edit
-- landed after the migration had already been applied to this database, so
-- it never took effect on its own — migrations aren't re-run once applied.
-- This brings the live data in line with what that file now says.

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
    ('Governor''s Councillor (5th District)', 'https://ballotpedia.org/Massachusetts_Governor''s_Council_election,_2026#District_5'),
    ('Governor''s Councillor (2nd District)', 'https://ballotpedia.org/Massachusetts_Governor''s_Council_election,_2026#District_2'),
    ('Governor''s Councillor (7th District)', 'https://ballotpedia.org/Massachusetts_Governor''s_Council_election,_2026#District_7')
  ) as v(name, url)
  where public.races.meetup_id = v_meetup_id
    and public.races.name = v.name;
end
$$;
