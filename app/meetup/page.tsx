import { redirect } from "next/navigation";
import { Suspense } from "react";

import { VotingPanel } from "@/components/voting-panel";
import { getMeetup, getRaceWithCandidates } from "@/lib/meetup";
import { createClient } from "@/lib/supabase/server";
import type { Vote } from "@/lib/types";

async function MeetupView() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) redirect("/auth/login");

  const meetup = await getMeetup(supabase);
  if (!meetup) {
    return (
      <p className="text-sm text-muted-foreground">
        No meetup has been set up yet. Run the migrations in{" "}
        <code>supabase/migrations</code> against your Supabase project.
      </p>
    );
  }

  const race = meetup.current_race_id
    ? await getRaceWithCandidates(supabase, meetup.current_race_id)
    : null;

  let vote: Pick<Vote, "choice" | "candidate_id"> | null = null;
  if (race) {
    const { data: ownVote } = await supabase
      .from("votes")
      .select("choice, candidate_id")
      .eq("race_id", race.id)
      .eq("voter_id", userId)
      .maybeSingle();
    vote = ownVote ?? null;
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{meetup.name}</h1>
      <VotingPanel
        meetupId={meetup.id}
        userId={userId}
        initialRace={race}
        initialVote={vote}
      />
    </>
  );
}

export default function MeetupPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-5 py-10">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading the meetup…</p>
        }
      >
        <MeetupView />
      </Suspense>
    </div>
  );
}
