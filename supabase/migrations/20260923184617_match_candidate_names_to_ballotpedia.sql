-- Renames candidates to match the name Ballotpedia displays for them (the
-- text of the link on their own bio page and on Ballotpedia's House/Senate
-- 2026 election hub pages — ballotpedia/house.html, ballotpedia/senate.html,
-- and ballotpedia.html for the three Governor's Council candidates, all
-- verified against the actual anchor text, not the URL slug).
--
-- The previous names were the candidates' full legal names, as filed with
-- the Secretary of the Commonwealth (see 20260923173320). Ballotpedia mostly
-- just drops middle names/initials, but not always — Jessica Rushing's
-- Ballotpedia page uses "Bradley" as a middle name where the official filing
-- has "Marie".
--
-- Plymouth County Commissioner is excluded: Ballotpedia doesn't cover that
-- race, so its two candidates (Nyman, O'Brien) keep their official names.

do $$
declare
  v_meetup_id bigint;
begin
  select id into v_meetup_id from public.meetups where slug = 'ma-2026-general';
  if v_meetup_id is null then
    raise exception 'meetup ma-2026-general not found';
  end if;

  update public.candidates set name = v.new_name
  from (values
    ('Dylan A. Fernandes', 'Dylan Fernandes'),
    ('Kari Della MacRae', 'Kari MacRae'),
    ('Eric J. Meschino', 'Eric Meschino'),
    ('Kristin Elena Kassner', 'Kristin Kassner'),
    ('Daniel James Kelly', 'Daniel Kelly'),
    ('Trevor David Currier', 'Trevor Currier'),
    ('Jessica Marie Rushing', 'Jessica Bradley Rushing'),
    ('Kenneth Peter Sweezey', 'Kenneth Sweezey'),
    ('David F. DeCoste', 'David DeCoste'),
    ('Donald H. Wong', 'Donald Wong'),
    ('Thomas R. Melville', 'Thomas Melville'),
    ('Marcus S. Vaughn', 'Marcus Vaughn'),
    ('Eunice Delice Zeigler', 'Eunice Zeigler'),
    ('Barry R. Finegold', 'Barry Finegold'),
    ('Theodore T. Semesnyei', 'Ted Semesnyei'),
    ('James Bradley Eldridge', 'James Eldridge'),
    ('Joseph Timothy Shea', 'Joseph Shea'),
    ('Tamisha L. Civil', 'Tamisha Civil'),
    ('Francis T. Crimmins, Jr.', 'Francis T. Crimmins Jr.'),
    ('Paul M. DePalo', 'Paul DePalo'),
    ('Margaret M. Abboud', 'Margaret Abboud')
  ) as v(old_name, new_name)
  where public.candidates.race_id in (
    select id from public.races
    where meetup_id = v_meetup_id
      and name != 'Plymouth County Commissioner'
  )
  and public.candidates.name = v.old_name;
end
$$;
