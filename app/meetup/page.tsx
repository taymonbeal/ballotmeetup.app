import { redirect } from "next/navigation";
import { Suspense } from "react";

import { VotingPanel } from "@/components/voting-panel";
import { getCandidateWithRace, getMeetup } from "@/lib/meetup";
import { createClient } from "@/lib/supabase/server";
import type { VoteChoice } from "@/lib/types";

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

  const candidate = meetup.current_candidate_id
    ? await getCandidateWithRace(supabase, meetup.current_candidate_id)
    : null;

  let choice: VoteChoice | null = null;
  if (candidate) {
    const { data: vote } = await supabase
      .from("votes")
      .select("choice")
      .eq("candidate_id", candidate.id)
      .eq("voter_id", userId)
      .maybeSingle();
    choice = (vote?.choice as VoteChoice | undefined) ?? null;
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{meetup.name}</h1>
      <VotingPanel
        meetupId={meetup.id}
        userId={userId}
        initialCandidate={candidate}
        initialChoice={choice}
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
