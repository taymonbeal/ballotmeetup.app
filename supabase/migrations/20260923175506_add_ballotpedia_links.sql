-- Adds an optional Ballotpedia link to races (including ballot questions,
-- which are just races with Yes/No candidates) and to candidates, so
-- participants can look a race or candidate up during discussion.
--
-- URLs for the ballot questions and for individual candidates were read
-- directly out of a Ballotpedia page the user saved locally (ballotpedia.html
-- in the repo root, not checked in) — ballotpedia.org itself blocks
-- automated fetches, same as sec.state.ma.us.
--
-- District/race-level pages (as opposed to individual candidates) weren't in
-- that saved page, so those come from web search results instead, trusting
-- the URL paired with an exact title match. Flagged because Ballotpedia is
-- inconsistent here: several districts have more than one page for the same
-- race (e.g. spelled-out vs. numeral ordinals in the slug), and which one is
-- canonical wasn't independently verified the way the candidate names were
-- against the Secretary of the Commonwealth's list. Worth spot-checking.
--
-- Not every race or candidate has one:
-- - Plymouth County Commissioner and its two candidates: Ballotpedia doesn't
--   cover this race at all (confirmed by search — no page exists).
-- - The three Governor's Council races share Ballotpedia's one combined
--   page for all eight council districts, rather than having their own.
-- - Ballot questions' Yes/No "candidates" don't get their own link — the
--   question only has the one Ballotpedia page, already on the race.

alter table public.races add column ballotpedia_url text;
alter table public.candidates add column ballotpedia_url text;

do $$
declare
  v_meetup_id bigint;
begin
  select id into v_meetup_id from public.meetups where slug = 'ma-2026-general';
  if v_meetup_id is null then
    raise exception 'meetup ma-2026-general not found';
  end if;

  -- ---------------------------------------------------------------------
  -- Races (ballot questions and district/office races).
  -- ---------------------------------------------------------------------

  update public.races set ballotpedia_url = v.url
  from (values
    ('Question 1: Public Records Law', 'https://ballotpedia.org/Massachusetts_Question_1,_Public_Records_Requirements_for_Legislature_and_Governor%E2%80%99s_Office_Initiative_(2026)'),
    ('Question 2: CPCS Collective Bargaining', 'https://ballotpedia.org/Massachusetts_Question_2,_Permit_Collective_Bargaining_for_Committee_for_Public_Counsel_Services_Employees_Initiative_(2026)'),
    ('Question 3: Eliminate Party Primaries', 'https://ballotpedia.org/Massachusetts_Question_3,_Top-Two_Primary_Elections_Initiative_(2026)'),
    ('Question 4: Election Day Registration', 'https://ballotpedia.org/Massachusetts_Question_4,_Permit_Same-Day_Voter_Registration_Initiative_(2026)'),
    ('Question 5: State Revenue Limit & Rebate', 'https://ballotpedia.org/Massachusetts_Question_5,_Change_State_Tax_Revenue_Limit_Initiative_(2026)'),
    ('Question 6: Natural Resource Conservation Fund', 'https://ballotpedia.org/Massachusetts_Question_6,_Establish_the_Nature_for_All_Fund_Initiative_(2026)'),
    ('Question 7: Single-Family Homes Zoning', 'https://ballotpedia.org/Massachusetts_Question_7,_Limit_on_Required_Lot_Size_for_Single-Family_Homes_Initiative_(2026)'),
    ('Question 8: Prohibit Retail Sale of Recreational Marijuana', 'https://ballotpedia.org/Massachusetts_Question_8,_Eliminate_Recreational_Marijuana_Sales_and_Allow_Limited_Possession_Initiative_(2026)'),
    ('Question 9: Firearms Regulation Repeal', 'https://ballotpedia.org/Massachusetts_Question_9,_Firearm_Regulations_Referendum_(2026)'),
    ('State Senator (Plymouth & Barnstable District)', 'https://ballotpedia.org/Massachusetts_State_Senate_Plymouth_and_Barnstable_District'),
    ('State Representative (12th Plymouth District)', 'https://ballotpedia.org/Massachusetts_House_of_Representatives_Twelfth_Plymouth_District'),
    ('State Representative (2nd Essex District)', 'https://ballotpedia.org/Massachusetts_House_of_Representatives_2nd_Essex_District'),
    ('State Representative (20th Middlesex District)', 'https://ballotpedia.org/Massachusetts_House_of_Representatives_Twentieth_Middlesex_District'),
    ('State Representative (6th Plymouth District)', 'https://ballotpedia.org/Massachusetts_House_of_Representatives_6th_Plymouth_District'),
    ('State Representative (5th Plymouth District)', 'https://ballotpedia.org/Massachusetts_House_of_Representatives_5th_Plymouth_District'),
    ('State Representative (9th Essex District)', 'https://ballotpedia.org/Massachusetts_House_of_Representatives_Ninth_Essex_District'),
    ('State Representative (9th Norfolk District)', 'https://ballotpedia.org/Massachusetts_House_of_Representatives_9th_Norfolk_District'),
    ('Governor''s Councillor (5th District)', 'https://ballotpedia.org/Massachusetts_Governor''s_Council_election,_2026#District_5'),
    ('State Senator (2nd Essex & Middlesex District)', 'https://ballotpedia.org/Massachusetts_State_Senate_2nd_Essex_and_Middlesex_District'),
    ('State Senator (Middlesex & Worcester District)', 'https://ballotpedia.org/Massachusetts_State_Senate_Middlesex_&_Worcester_District'),
    ('Governor''s Councillor (2nd District)', 'https://ballotpedia.org/Massachusetts_Governor''s_Council_election,_2026#District_2'),
    ('Governor''s Councillor (7th District)', 'https://ballotpedia.org/Massachusetts_Governor''s_Council_election,_2026#District_7')
  ) as v(name, url)
  where public.races.meetup_id = v_meetup_id
    and public.races.name = v.name;

  -- ---------------------------------------------------------------------
  -- Candidates.
  -- ---------------------------------------------------------------------

  update public.candidates set ballotpedia_url = v.url
  from (values
    ('Dylan A. Fernandes', 'https://ballotpedia.org/Dylan_Fernandes'),
    ('Kari Della MacRae', 'https://ballotpedia.org/Kari_MacRae'),
    ('Kathleen LaNatra', 'https://ballotpedia.org/Kathleen_LaNatra'),
    ('Eric J. Meschino', 'https://ballotpedia.org/Eric_Meschino'),
    ('Kristin Elena Kassner', 'https://ballotpedia.org/Kristin_Kassner'),
    ('Daniel James Kelly', 'https://ballotpedia.org/Daniel_Kelly_(Massachusetts_House_of_Representatives_candidate)'),
    ('Joseph Markey', 'https://ballotpedia.org/Joseph_Markey'),
    ('Trevor David Currier', 'https://ballotpedia.org/Trevor_Currier'),
    ('Jessica Marie Rushing', 'https://ballotpedia.org/Jessica_Bradley_Rushing'),
    ('Kenneth Peter Sweezey', 'https://ballotpedia.org/Kenneth_Sweezey'),
    ('Lori Childs', 'https://ballotpedia.org/Lori_Childs'),
    ('David F. DeCoste', 'https://ballotpedia.org/David_DeCoste'),
    ('Peter Meaney', 'https://ballotpedia.org/Peter_Meaney'),
    ('Donald H. Wong', 'https://ballotpedia.org/Donald_Wong'),
    ('Thomas R. Melville', 'https://ballotpedia.org/Thomas_Melville'),
    ('Marcus S. Vaughn', 'https://ballotpedia.org/Marcus_Vaughn'),
    ('Eunice Delice Zeigler', 'https://ballotpedia.org/Eunice_Zeigler'),
    ('William Falcetano', 'https://ballotpedia.org/William_Falcetano'),
    ('Barry R. Finegold', 'https://ballotpedia.org/Barry_Finegold'),
    ('Theodore T. Semesnyei', 'https://ballotpedia.org/Ted_Semesnyei'),
    ('James Bradley Eldridge', 'https://ballotpedia.org/James_Eldridge'),
    ('Joseph Timothy Shea', 'https://ballotpedia.org/Joseph_Shea_(Massachusetts_State_Senate_candidate)'),
    ('Tamisha L. Civil', 'https://ballotpedia.org/Tamisha_Civil'),
    ('Francis T. Crimmins, Jr.', 'https://ballotpedia.org/Francis_T._Crimmins_Jr.'),
    ('Paul M. DePalo', 'https://ballotpedia.org/Paul_DePalo'),
    ('Margaret M. Abboud', 'https://ballotpedia.org/Margaret_Abboud')
  ) as v(name, url)
  where public.candidates.race_id in (select id from public.races where meetup_id = v_meetup_id)
    and public.candidates.name = v.name;
end
$$;
