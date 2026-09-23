-- Plymouth County Commissioner isn't on Ballotpedia, so its two candidates
-- had their full legal names from the Secretary of the Commonwealth's filing
-- instead. Shortens them to the names actually used on their campaigns, and
-- adds each candidate's website and Facebook page.
--
-- website_url and facebook_url are added to the whole candidates table, the
-- same way ballotpedia_url was — most candidates won't have one filled in.

alter table public.candidates add column website_url text;
alter table public.candidates add column facebook_url text;

do $$
declare
  v_meetup_id bigint;
begin
  select id into v_meetup_id from public.meetups where slug = 'ma-2026-general';
  if v_meetup_id is null then
    raise exception 'meetup ma-2026-general not found';
  end if;

  update public.candidates
  set name = 'Rhonda Nyman',
      website_url = 'https://www.nymanforplymouth.com',
      facebook_url = 'https://www.facebook.com/NymanforCountyCommissioner/'
  where race_id in (select id from public.races where meetup_id = v_meetup_id and name = 'Plymouth County Commissioner')
    and name = 'Rhonda L. Nyman';

  update public.candidates
  set name = 'Anthony O''Brien',
      website_url = 'https://anthonyobrien.com',
      facebook_url = 'https://www.facebook.com/AnthonyOBrienSr'
  where race_id in (select id from public.races where meetup_id = v_meetup_id and name = 'Plymouth County Commissioner')
    and name = 'Anthony Thomas O''Brien, Sr.';
end
$$;
