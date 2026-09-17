# ballotmeetup.app

Software for running a [ballot meetup](https://www.lesswrong.com/posts/Sa6jkgpkrDnqswRBN/how-to-run-a-ballot-meetup):
a group works through the ballot one contest at a time, discusses each race for
a few minutes, and votes on whether to recommend each candidate. A simple
majority of non-abstaining votes carries; if no candidate in a race gets a
majority, the group makes no recommendation.

This is the first iteration, and it covers one meetup — the Massachusetts 2026
general election — and one job: keeping everyone on the same candidate at the
same time.

- Participants open `/meetup` and see whichever candidate is currently open for
  a vote, with Yes / No / Abstain buttons.
- The moderator opens `/admin`, steps through the ballot, and sees the running
  tally plus who has and hasn't voted.
- When the moderator changes the candidate, every participant's screen follows
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

   or paste the two files in `supabase/migrations/` into the SQL editor in the
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

5. Replace the placeholder candidates. The seed migration creates the
   Massachusetts statewide races with stand-in candidate names, because the
   real names have to be typed in by hand for now:

   ```sql
   select c.id, r.name as race, c.name from public.candidates c
   join public.races r on r.id = c.race_id order by r.sort_order, c.sort_order;

   update public.candidates set name = 'Real Name' where id = 3;
   ```

   A ballot question is just a race whose two candidates are "Yes" and "No".

## Schema

| Table | What it holds |
| --- | --- |
| `profiles` | One row per signed-up user, created by a trigger on `auth.users`. `is_admin` marks moderators and is only ever set by hand in SQL. |
| `meetups` | The meetup, and `current_candidate_id` — the candidate currently open for a vote. This single column is the shared state the whole app revolves around. |
| `races` | A contest on the ballot, ordered by `sort_order`. |
| `candidates` | A candidate in a race (or a Yes/No option on a ballot question). |
| `votes` | One row per participant per candidate: `yes`, `no`, or `abstain`. |

Row level security does the real enforcement, so the browser client can talk to
the database directly:

- Only moderators can change `current_candidate_id`, and a column grant means
  that is the only column of `meetups` anyone can write.
- You can only vote as yourself, and only on the candidate that is currently
  open — so when the moderator moves on, the previous candidate's votes freeze.
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
