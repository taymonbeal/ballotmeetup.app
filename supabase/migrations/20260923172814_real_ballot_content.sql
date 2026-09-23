-- Replaces the placeholder ballot from the seed migration with the real
-- November 3, 2026 Massachusetts general election ballot: the nine statewide
-- questions, in their official order, followed by the specific races given
-- for this meetup, in the order requested.
--
-- Sourced from the Secretary of the Commonwealth's certified ballot question
-- list as reported by CBS Boston and Boston.com (independently matching),
-- and for candidates, cross-checked between theballotbrief.com's per-county
-- November-general-election listings, Ballotpedia/Wikipedia, and dated local
-- news coverage of each specific race. The Secretary of the Commonwealth's
-- own candidate-list page (sec.state.ma.us) could not be fetched directly —
-- it sits behind an Incapsula bot-protection wall that blocked every attempt,
-- including through a real browser — so nothing here is drawn from it
-- directly. Nominees can still shift between now and the election (a
-- candidate could withdraw, a recount could flip a primary); check this
-- against an official source before the meetup and fix with a plain
-- `update public.candidates set name = ...` if anything has changed.
--
-- No real votes exist against the placeholder ballot as of this migration
-- (only test data, already cleaned up), so it's dropped and replaced rather
-- than migrated row by row.

do $$
declare
  v_meetup_id bigint;
  v_race_id bigint;
begin
  select id into v_meetup_id from public.meetups where slug = 'ma-2026-general';
  if v_meetup_id is null then
    raise exception 'meetup ma-2026-general not found; run the seed migration first';
  end if;

  -- Cascades to candidates, and to any votes referencing them.
  delete from public.races where meetup_id = v_meetup_id;

  -- ---------------------------------------------------------------------
  -- Statewide ballot questions, in official order.
  -- ---------------------------------------------------------------------

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'Question 1: Public Records Law',
    'Would make most records of the Legislature and the Governor''s office subject to the state''s public records law.',
    1
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, sort_order) values
    (v_race_id, 'Yes', 1), (v_race_id, 'No', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'Question 2: CPCS Collective Bargaining',
    'Would allow public defenders and other employees of the Committee for Public Counsel Services to unionize and bargain collectively.',
    2
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, sort_order) values
    (v_race_id, 'Yes', 1), (v_race_id, 'No', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'Question 3: Eliminate Party Primaries',
    'Would eliminate party primaries for state elections; all candidates would appear on one ballot, with the top two advancing to the general election.',
    3
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, sort_order) values
    (v_race_id, 'Yes', 1), (v_race_id, 'No', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'Question 4: Election Day Registration',
    'Would allow Massachusetts residents to register to vote and cast a ballot on Election Day.',
    4
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, sort_order) values
    (v_race_id, 'Yes', 1), (v_race_id, 'No', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'Question 5: State Revenue Limit & Rebate',
    'Would limit how much revenue the state can collect in a year, refunding any excess to taxpayers.',
    5
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, sort_order) values
    (v_race_id, 'Yes', 1), (v_race_id, 'No', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'Question 6: Natural Resource Conservation Fund',
    'Would dedicate revenue from a sales tax on sporting goods, recreational vehicles, and golf courses to natural resources conservation.',
    6
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, sort_order) values
    (v_race_id, 'Yes', 1), (v_race_id, 'No', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'Question 7: Single-Family Homes Zoning',
    'Would allow single-family homes to be built on residentially zoned lots of at least 5,000 square feet.',
    7
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, sort_order) values
    (v_race_id, 'Yes', 1), (v_race_id, 'No', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'Question 8: Prohibit Retail Sale of Recreational Marijuana',
    'Would repeal the 2016 ballot question that legalized the retail sale of recreational marijuana in Massachusetts.',
    8
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, sort_order) values
    (v_race_id, 'Yes', 1), (v_race_id, 'No', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'Question 9: Firearms Regulation Repeal',
    'Would repeal the 2024 law that changed the state''s assault weapons ban to an assault-style firearms ban.',
    9
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, sort_order) values
    (v_race_id, 'Yes', 1), (v_race_id, 'No', 2);

  -- ---------------------------------------------------------------------
  -- Races for office, in the given order.
  -- ---------------------------------------------------------------------

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'State Senator (Plymouth & Barnstable District)', 'Two-year term.', 10)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Dylan A. Fernandes', 'Democratic', 1),
    (v_race_id, 'Kari Della Macrae', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'State Representative (12th Plymouth District)', 'Two-year term.', 11)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Kathleen R. LaNatra', 'Democratic', 1),
    (v_race_id, 'Eric J. Meschino', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'State Representative (2nd Essex District)',
    'Two-year term. Includes Ipswich, Hamilton, Rowley, Newbury, Georgetown, and part of Topsfield.',
    12
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Kristin Elena Kassner', 'Democratic', 1),
    (v_race_id, 'Daniel Kelly', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'State Representative (20th Middlesex District)',
    'Two-year term. Includes Lynnfield, North Reading, and parts of Middleton and Reading. Open seat.',
    13
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Joseph Markey', 'Democratic', 1),
    (v_race_id, 'Trevor David Currier', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'State Representative (6th Plymouth District)', 'Two-year term.', 14)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Jessica Marie Rushing', 'Democratic', 1),
    (v_race_id, 'Kenneth Sweezey', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'State Representative (5th Plymouth District)', 'Two-year term.', 15)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Lori Childs', 'Democratic', 1),
    (v_race_id, 'David F. DeCoste', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'State Representative (9th Essex District)',
    'Two-year term. Includes parts of Lynn and Saugus, and part of Wakefield.',
    16
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Peter Meaney', 'Democratic', 1),
    (v_race_id, 'Donald H. Wong', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (
    v_meetup_id,
    'State Representative (9th Norfolk District)',
    'Two-year term. Includes Wrentham, Norfolk, Plainville, and parts of Medfield, Walpole, and Millis.',
    17
  ) returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Thomas R. Melville', 'Democratic', 1),
    (v_race_id, 'Marcus S. Vaughn', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'Plymouth County Commissioner', 'Four-year term.', 18)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Rhonda L. Nyman', 'Democratic', 1),
    (v_race_id, 'Anthony O''Brien', 'Republican', 2);

  -- Unopposed: no Republican candidate filed for this seat.
  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'Governor''s Councillor (5th District)', 'Two-year term.', 19)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Eunice Zeigler', 'Democratic', 1);

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'State Senator (2nd Essex & Middlesex District)', 'Two-year term.', 20)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Barry R. Finegold', 'Democratic', 1),
    (v_race_id, 'Theodore T. Semesnyei', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'State Senator (Middlesex & Worcester District)', 'Two-year term.', 21)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'James Bradley Eldridge', 'Democratic', 1),
    (v_race_id, 'Joseph Timothy Shea', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'Governor''s Councillor (2nd District)', 'Two-year term.', 22)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Tamisha Civil', 'Democratic', 1),
    (v_race_id, 'Francis Crimmins Jr.', 'Republican', 2);

  insert into public.races (meetup_id, name, description, sort_order)
  values (v_meetup_id, 'Governor''s Councillor (7th District)', 'Two-year term.', 23)
  returning id into v_race_id;
  insert into public.candidates (race_id, name, party, sort_order) values
    (v_race_id, 'Paul DePalo', 'Democratic', 1),
    (v_race_id, 'Margaret Abboud', 'Republican', 2);
end
$$;
