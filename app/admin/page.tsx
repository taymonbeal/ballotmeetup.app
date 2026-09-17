import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminPanel } from "@/components/admin-panel";
import {
  getMeetup,
  getParticipants,
  getProfile,
  getRacesWithCandidates,
  getVotes,
} from "@/lib/meetup";
import { createClient } from "@/lib/supabase/server";

async function AdminView() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) redirect("/auth/login");

  const profile = await getProfile(supabase, userId);
  if (!profile?.is_admin) {
    return (
      <p className="text-sm text-muted-foreground">
        This page is for meetup moderators.{" "}
        <Link href="/meetup" className="underline underline-offset-4">
          Go to the meetup
        </Link>
        .
      </p>
    );
  }

  const meetup = await getMeetup(supabase);
  if (!meetup) {
    return (
      <p className="text-sm text-muted-foreground">
        No meetup has been set up yet. Run the migrations in{" "}
        <code>supabase/migrations</code> against your Supabase project.
      </p>
    );
  }

  const [races, participants, votes] = await Promise.all([
    getRacesWithCandidates(supabase, meetup.id),
    getParticipants(supabase),
    meetup.current_candidate_id
      ? getVotes(supabase, meetup.current_candidate_id)
      : Promise.resolve([]),
  ]);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {meetup.name} — moderator
        </h1>
        <p className="text-sm text-muted-foreground">
          Opening a candidate for voting changes what every participant sees.
        </p>
      </div>
      <AdminPanel
        meetupId={meetup.id}
        races={races}
        participants={participants}
        initialCurrentCandidateId={meetup.current_candidate_id}
        initialVotes={votes}
      />
    </>
  );
}

export default function AdminPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-5 py-10">
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">Loading the meetup…</p>
        }
      >
        <AdminView />
      </Suspense>
    </div>
  );
}
