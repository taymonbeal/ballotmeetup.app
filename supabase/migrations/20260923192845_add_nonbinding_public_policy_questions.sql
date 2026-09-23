-- Adds the four nonbinding public policy questions (Nonbinding.txt, not
-- checked in), in the order given, between the 9th Essex and 9th Norfolk
-- House races. Unlike the nine binding statewide questions, each of these
-- only actually appears on the ballot for voters in specific state
-- representative districts — noted in each one's description, verbatim from
-- the source — rather than being a single statewide question. They're a
-- straight "shall the Representative be instructed to..." advisory vote, not
-- tied to a candidate, so they get the same Yes/No race shape as the binding
-- questions. No Ballotpedia/website/Facebook links: these are local
-- questions Ballotpedia doesn't track, unlike the statewide ones.

do $$
declare
  v_meetup_id bigint;
  v_race_id bigint;
begin
  select id into v_meetup_id from public.meetups where slug = 'ma-2026-general';
  if v_meetup_id is null then
    raise exception 'meetup ma-2026-general not found';
  end if;

  -- Make room: shift 9th Norfolk and everything after it back by 4.
  update public.races
  set sort_order = sort_order + 4
  where meetup_id = v_meetup_id
    and sort_order >= 17;

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'Nonbinding Question 1: Legislative Stipend Reform',
    'Shall the Representative from this District be instructed to vote in favor of legislation or rules to reduce the House Speaker''s and Senate President''s control over state legislators'' stipends (extra pay) and to provide stipends only to legislators who do significant extra work that is transparent and accountable to the public? (For voters in the Barnstable, Dukes, and Nantucket; and 13th, 14th, 15th, 20th, 25th, 29th, and 32nd Middlesex state representative districts.)',
    17
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, sort_order) values
    (v_race_id, 'Yes', 1), (v_race_id, 'No', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'Nonbinding Question 2: Abolish Norfolk County Government',
    'Shall the Representative from this District be instructed to file and support legislation abolishing Norfolk County government? (For voters in the 1st Bristol and 5th Norfolk state representative districts.)',
    18
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, sort_order) values
    (v_race_id, 'Yes', 1), (v_race_id, 'No', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'Nonbinding Question 3: Carbon Fee and Dividend',
    'Shall the Representative from this District be instructed to introduce and vote for legislation that places a fee on the carbon content of fossil fuels to compensate for their environmental pollution, and returns the proceeds directly to residents as monthly payments? (For voters in the 1st and 8th Essex state representative districts.)',
    19
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, sort_order) values
    (v_race_id, 'Yes', 1), (v_race_id, 'No', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'Nonbinding Question 4: Single-Payer Health Care',
    'Shall the Representative from this District be instructed to vote for legislation to create a single-payer system of universal health care that would provide all Massachusetts residents with comprehensive health care coverage including the freedom to choose doctors and other health care professionals, facilities, and services, and that would eliminate the role of insurance companies in health care by creating a publicly administered insurance trust fund? (For voters in the 1st Hampden and 15th Middlesex state representative districts.)',
    20
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, sort_order) values
    (v_race_id, 'Yes', 1), (v_race_id, 'No', 2);
end
$$;
