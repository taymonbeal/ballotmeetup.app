# ballotmeetup.app

> [!WARNING]
> Basically everything in this repository, including this readme (except this
> paragraph), was written by Claude Code, often without any substantial human
> review. LLM-typical failure modes are likely. Please file an issue if you
> spot anything wrong.


Software for running a [ballot meetup](https://www.lesswrong.com/posts/Sa6jkgpkrDnqswRBN/how-to-run-a-ballot-meetup):
a group works through the ballot one contest at a time, discusses each race for
a few minutes, and votes on whether to recommend each candidate. A simple
majority of non-abstaining votes carries; if no candidate in a race gets a
majority, the group makes no recommendation.

This is the first iteration, and it covers one meetup — the Massachusetts 2026
general election — and one job: keeping everyone on the same race at the same
time.

- Participants open `/meetup` and see whichever race is currently open for a
  vote. For it, they pick exactly one of: a specific candidate, "No
  recommendation", or "Abstain".
- The moderator opens `/admin`, steps through the ballot one race at a time,
  and sees the running tally (by candidate, plus no-recommendation and
  abstain) and who has and hasn't voted.
- When the moderator changes the race, every participant's screen follows
  within a fraction of a second, over Supabase Realtime.

## Stack

Next.js (App Router, Cache Components) and Supabase (Postgres, Auth, Realtime).
Realtime is the reason for Supabase: the shared "what are we voting on right
now" state is the core of the app.

Node 22 or newer is required (`.nvmrc` pins 24).

## Setup

1. Create a Supabase project and put its URL and publishable key in
   `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
   ```

2. Apply the database schema. Either link the project and push:

   ```bash
   npm run db:link   # asks for your project ref
   npm run db:push
   ```

   or paste the files in `supabase/migrations/` into the SQL editor in the
   Supabase dashboard, in filename order.

3. Run the app:

   ```bash
   npm run dev
   ```

4. Sign up through the app, then make yourself a moderator. In the SQL editor:

   ```sql
   update public.profiles set is_admin = true
   where id = (select id from auth.users where email = 'you@example.com');
   ```

5. The ballot is seeded with the nine statewide questions and the specific
   races the meetup this is for actually has, in `supabase/migrations/`. It
   was compiled from news coverage and campaign sites, not the Secretary of
   the Commonwealth's own candidate list (that page blocks automated fetches),
   so double check it against an official source before the meetup. Fix
   anything wrong directly in SQL:

   ```sql
   select c.id, r.name as race, c.name from public.candidates c
   join public.races r on r.id = c.race_id order by r.sort_order, c.sort_order;

   update public.candidates set name = 'Real Name' where id = 3;
   ```

   A ballot question is just a race whose two candidates are "Yes" and "No".

## Testing

> [!CAUTION]
> These tests are AI-generated and need substantial improvement before they can
> be useful.

```bash
npm test
```

`tests/unit/` is pure logic (the majority/tally calculation) and always runs.
`tests/integration/` exercises the real RLS policies and constraints — and
Realtime delivery — against an actual Supabase instance, so it needs one to
run against:

```bash
npm run db:start        # requires Docker; supabase start
supabase status -o env  # prints the values .env.test.example asks for
cp .env.test.example .env.test.local   # then fill it in
npm test
```

Point this only at a **local** instance (never a hosted project): these tests
create and delete users and data as part of running. Without `.env.test.local`,
`npm test` still runs the unit tests; the integration tests just skip
themselves with a reminder of the above.

## Schema

| Table | What it holds |
| --- | --- |
| `profiles` | One row per signed-up user, created by a trigger on `auth.users`. `is_admin` marks moderators and is only ever set by hand in SQL. |
| `meetups` | The meetup, and `current_race_id` — the race currently open for a vote. This single column is the shared state the whole app revolves around. |
| `races` | A contest on the ballot, ordered by `sort_order`. `ballotpedia_url` is optional — not every race has a Ballotpedia page (county-level races in particular often don't). |
| `candidates` | A candidate in a race (or a Yes/No option on a ballot question). `ballotpedia_url` is optional the same way; a ballot question's Yes/No options never have one — the question itself does, on the race. |
| `votes` | One row per participant per race: `choice` is `candidate`, `no_recommendation`, or `abstain`, and `candidate_id` is set only when `choice = 'candidate'`. |

A voter picks one thing per race, not a yes/no per candidate — `votes` has a
`unique (race_id, voter_id)` constraint, and a composite foreign key on
`(candidate_id, race_id)` makes it impossible to record a vote for a candidate
who isn't actually running in that race.

Row level security does the real enforcement, so the browser client can talk to
the database directly:

- Only moderators can change `current_race_id`, and a column grant means that
  is the only column of `meetups` anyone can write.
- You can only vote as yourself, and only in the race that is currently open —
  so when the moderator moves on, the previous race's votes freeze.
- Participants see only their own votes. Moderators see everyone's.

Realtime carries changes to `meetups` (everyone) and `votes` (moderators, for
the roster). Realtime checks the same policies per subscriber, so a participant
never receives someone else's vote.

## Not built yet

The post this is based on describes a lot more than one evening of voting. The
pieces this iteration deliberately leaves out:

- More than one meetup. `MEETUP_SLUG` in `lib/meetup.ts` becomes a route
  parameter, and `profiles` grows a per-meetup attendee list instead of
  "everyone who signed up is a participant".
- Editing races and candidates in the app, rather than in SQL.
- The write-up phase: assigning rationale statements to the people who voted
  for a recommendation, drafts, approvals, reminders, publication.
- Recording the result of a race (which recommendation carried) as durable
  data rather than something the moderator reads off the screen.
