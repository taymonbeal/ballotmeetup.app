-- Ballot meetup: initial schema.
--
-- A meetup works through a list of races. Each race has candidates, and the
-- group votes on one candidate at a time. The moderator (admin) decides which
-- candidate is currently up for a vote by setting meetups.current_candidate_id;
-- that column is the single piece of shared state every participant's screen
-- follows in real time.

-- Helper functions live here. Nobody but the owner has USAGE on this schema,
-- so anon and authenticated cannot call anything in it directly, which is what
-- keeps the security definer function below from being a public endpoint.
create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 100),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per signed-up user. Everyone with a profile is treated as a participant of the (single) meetup for now.';
comment on column public.profiles.is_admin is
  'Moderator flag. Set by hand in SQL; never derived from user-editable metadata.';

-- Populate a profile whenever a user signs up. The display name comes from
-- sign-up metadata, which is user-editable and therefore only ever used for
-- display, never for authorization.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
        split_part(coalesce(new.email, 'participant'), '@', 1)
      ),
      100
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- meetups, races, candidates
-- ---------------------------------------------------------------------------

create table public.meetups (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.races (
  id bigint generated always as identity primary key,
  meetup_id bigint not null references public.meetups (id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create index races_meetup_id_sort_order_idx
  on public.races (meetup_id, sort_order);

create table public.candidates (
  id bigint generated always as identity primary key,
  race_id bigint not null references public.races (id) on delete cascade,
  name text not null,
  party text,
  sort_order integer not null,
  created_at timestamptz not null default now()
);

create index candidates_race_id_sort_order_idx
  on public.candidates (race_id, sort_order);

-- Declared here rather than in the create table above because meetups and
-- candidates reference each other.
alter table public.meetups
  add column current_candidate_id bigint
    references public.candidates (id) on delete set null;

create index meetups_current_candidate_id_idx
  on public.meetups (current_candidate_id);

comment on column public.meetups.current_candidate_id is
  'The candidate currently being voted on, or null when no vote is open. Changing this is what drives every participant''s screen.';

-- ---------------------------------------------------------------------------
-- votes
-- ---------------------------------------------------------------------------

create type public.vote_choice as enum ('yes', 'no', 'abstain');

create table public.votes (
  id bigint generated always as identity primary key,
  candidate_id bigint not null references public.candidates (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  choice public.vote_choice not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_id, voter_id)
);

-- The unique constraint indexes (candidate_id, voter_id); this covers lookups
-- and cascades that start from the voter.
create index votes_voter_id_idx on public.votes (voter_id);

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger votes_touch_updated_at
  before update on public.votes
  for each row execute function private.touch_updated_at();

-- True while the given candidate is the one the moderator has opened for
-- voting. Security invoker: every table it reads is readable by participants.
create function public.is_candidate_open_for_voting(p_candidate_id bigint)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.candidates c
    join public.races r on r.id = c.race_id
    join public.meetups m on m.id = r.meetup_id
    where c.id = p_candidate_id
      and m.current_candidate_id = c.id
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.meetups enable row level security;
alter table public.races enable row level security;
alter table public.candidates enable row level security;
alter table public.votes enable row level security;

-- Participants can see each other: the moderator needs the roster to know who
-- has not voted yet, and a meetup is a room full of people who already know
-- who is present.
create policy profiles_select_authenticated on public.profiles
  for select to authenticated
  using (true);

create policy meetups_select_authenticated on public.meetups
  for select to authenticated
  using (true);

-- Only moderators move the meetup along. Column grants below keep everything
-- except current_candidate_id out of reach.
create policy meetups_update_admin on public.meetups
  for update to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_admin
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_admin
    )
  );

create policy races_select_authenticated on public.races
  for select to authenticated
  using (true);

create policy candidates_select_authenticated on public.candidates
  for select to authenticated
  using (true);

-- Participants see their own vote; moderators see everyone's, which is what
-- the "who has voted" view is built on.
create policy votes_select_own_or_admin on public.votes
  for select to authenticated
  using (
    voter_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.is_admin
    )
  );

-- You may only vote as yourself, and only on the candidate that is currently
-- open. Once the moderator moves on, votes on the previous candidate are
-- frozen.
create policy votes_insert_own on public.votes
  for insert to authenticated
  with check (
    voter_id = (select auth.uid())
    and (select public.is_candidate_open_for_voting(candidate_id))
  );

create policy votes_update_own on public.votes
  for update to authenticated
  using (
    voter_id = (select auth.uid())
    and (select public.is_candidate_open_for_voting(candidate_id))
  )
  with check (
    voter_id = (select auth.uid())
    and (select public.is_candidate_open_for_voting(candidate_id))
  );

-- ---------------------------------------------------------------------------
-- Data API grants
--
-- New Supabase projects no longer expose tables to the Data API automatically,
-- so each role's privileges are granted explicitly. Nothing is readable
-- anonymously: you have to sign in to see the meetup.
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;

-- Start from nothing: projects created before that change may still have
-- default privileges that hand new tables to anon and authenticated.
revoke all on table
  public.profiles, public.meetups, public.races, public.candidates, public.votes
  from anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.meetups to authenticated;
grant update (current_candidate_id) on table public.meetups to authenticated;
grant select on table public.races to authenticated;
grant select on table public.candidates to authenticated;
-- The updatable columns are exactly the ones an upsert of a vote writes; a
-- participant cannot rewrite created_at or reassign a vote to someone else.
grant select, insert on table public.votes to authenticated;
grant update (candidate_id, voter_id, choice) on table public.votes to authenticated;

grant execute on function public.is_candidate_open_for_voting(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
--
-- Participants follow meetups.current_candidate_id; moderators additionally
-- follow votes so the roster updates as people vote. Realtime authorizes each
-- event against the subscriber's own RLS, so participants never receive other
-- people's votes.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.meetups;
alter publication supabase_realtime add table public.votes;
