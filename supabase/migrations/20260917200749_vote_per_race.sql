-- Change the unit of voting from "one candidate at a time" to "one race at a
-- time". Within a race, each participant casts exactly one vote: for a
-- specific candidate, for "no recommendation", or to abstain. This replaces
-- meetups.current_candidate_id with meetups.current_race_id and replaces the
-- old per-candidate yes/no/abstain vote with a single choice per race.
--
-- No real votes exist yet (this ships alongside the first release), so the
-- votes table is dropped and recreated rather than migrated in place.

-- Order matters: the table's own RLS policies depend on the function, and
-- its choice column depends on the type, so the table has to go first.
drop table public.votes;

drop function if exists public.is_candidate_open_for_voting(bigint);

drop type public.vote_choice;

-- ---------------------------------------------------------------------------
-- meetups: current_candidate_id -> current_race_id
-- ---------------------------------------------------------------------------

alter table public.meetups drop column current_candidate_id;

alter table public.meetups
  add column current_race_id bigint references public.races (id) on delete set null;

create index meetups_current_race_id_idx
  on public.meetups (current_race_id);

comment on column public.meetups.current_race_id is
  'The race currently open for a vote, or null when no vote is open. Changing this is what drives every participant''s screen.';

-- Lets votes reference (candidate_id, race_id) together and have Postgres
-- enforce that the candidate actually belongs to the race being voted on.
alter table public.candidates
  add constraint candidates_id_race_id_key unique (id, race_id);

-- ---------------------------------------------------------------------------
-- votes
-- ---------------------------------------------------------------------------

create type public.vote_choice as enum ('candidate', 'no_recommendation', 'abstain');

create table public.votes (
  id bigint generated always as identity primary key,
  race_id bigint not null references public.races (id) on delete cascade,
  -- Set only when choice = 'candidate'. The composite foreign key below
  -- checks candidate_id against race_id together, so a vote can't name a
  -- candidate from a different race; a null candidate_id (the other two
  -- choices) trivially satisfies a composite foreign key.
  candidate_id bigint,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  choice public.vote_choice not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (race_id, voter_id),
  foreign key (candidate_id, race_id) references public.candidates (id, race_id) on delete cascade,
  constraint votes_candidate_id_matches_choice check (
    (choice = 'candidate' and candidate_id is not null)
    or (choice in ('no_recommendation', 'abstain') and candidate_id is null)
  )
);

create index votes_voter_id_idx on public.votes (voter_id);
create index votes_candidate_id_idx on public.votes (candidate_id);

create trigger votes_touch_updated_at
  before update on public.votes
  for each row execute function private.touch_updated_at();

-- True while the given race is the one the moderator has opened for voting.
create function public.is_race_open_for_voting(p_race_id bigint)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.races r
    join public.meetups m on m.id = r.meetup_id
    where r.id = p_race_id
      and m.current_race_id = r.id
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.votes enable row level security;

create policy votes_select_own_or_admin on public.votes
  for select to authenticated
  using (
    voter_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_admin
    )
  );

create policy votes_insert_own on public.votes
  for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and (select public.is_race_open_for_voting(race_id))
  );

create policy votes_update_own on public.votes
  for update to authenticated
  using (
    voter_id = (select auth.uid())
    and (select public.is_race_open_for_voting(race_id))
  )
  with check (
    voter_id = (select auth.uid())
    and (select public.is_race_open_for_voting(race_id))
  );

-- ---------------------------------------------------------------------------
-- Data API grants
-- ---------------------------------------------------------------------------

-- Dropping current_candidate_id above already took its column privilege with
-- it; only the new column needs a grant.
grant update (current_race_id) on table public.meetups to authenticated;

revoke all on table public.votes from anon, authenticated;
grant select, insert on table public.votes to authenticated;
-- Matches the columns an upsert of a vote writes; a participant cannot
-- rewrite created_at or reassign a vote to someone else.
grant update (race_id, candidate_id, voter_id, choice) on table public.votes to authenticated;

grant execute on function public.is_race_open_for_voting(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
--
-- Dropping the table removed it from the publication; put it back.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.votes;
