-- Seeds the one meetup this iteration supports.
--
-- The candidate rows are PLACEHOLDERS. Replace them with the real names on the
-- ballot before running a meetup, e.g.
--
--   update public.candidates set name = 'Jane Doe' where id = 3;
--
-- A ballot question is modelled as a race whose two "candidates" are Yes and
-- No, so the same one-thing-at-a-time voting flow covers it.
--
-- Re-running this file is a no-op once the meetup exists.

do $$
declare
  v_meetup_id bigint;
  v_race_id bigint;
begin
  if exists (select 1 from public.meetups where slug = 'ma-2026-general') then
    raise notice 'Meetup ma-2026-general already exists; skipping seed.';
    return;
  end if;

  insert into public.meetups (slug, name)
  values ('ma-2026-general', 'Massachusetts 2026 General Election')
  returning id into v_meetup_id;

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'U.S. Senator', 'Statewide. Class 2 seat.', 1)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Democratic nominee (replace with real name)', 'Democratic', 1),
    (v_race_id, 'Republican nominee (replace with real name)', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'Governor and Lieutenant Governor', 'Statewide. Governor and Lt. Governor run as a single ticket in the general election.', 2)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Democratic ticket (replace with real names)', 'Democratic', 1),
    (v_race_id, 'Republican ticket (replace with real names)', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'Attorney General', 'Statewide.', 3)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Democratic nominee (replace with real name)', 'Democratic', 1),
    (v_race_id, 'Republican nominee (replace with real name)', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'Secretary of the Commonwealth', 'Statewide.', 4)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Democratic nominee (replace with real name)', 'Democratic', 1),
    (v_race_id, 'Republican nominee (replace with real name)', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'Treasurer and Receiver-General', 'Statewide.', 5)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Democratic nominee (replace with real name)', 'Democratic', 1),
    (v_race_id, 'Republican nominee (replace with real name)', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'Auditor', 'Statewide.', 6)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Democratic nominee (replace with real name)', 'Democratic', 1),
    (v_race_id, 'Republican nominee (replace with real name)', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'Ballot Question 1 (replace with the real question)', 'Example of a ballot question. Delete or edit once the certified questions are known.', 7)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Yes', null, 1),
    (v_race_id, 'No', null, 2);
end
$$;
