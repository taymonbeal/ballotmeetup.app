"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  RealtimeStatus,
  statusFromChannel,
  type ConnectionStatus,
} from "@/components/realtime-status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCandidateWithRace, getMeetup } from "@/lib/meetup";
import { VOTE_CHOICES, type CandidateWithRace, type VoteChoice } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const CHOICE_LABELS: Record<VoteChoice, string> = {
  yes: "Yes",
  no: "No",
  abstain: "Abstain",
};

export function VotingPanel({
  meetupId,
  userId,
  initialCandidate,
  initialChoice,
}: {
  meetupId: number;
  userId: string;
  initialCandidate: CandidateWithRace | null;
  initialChoice: VoteChoice | null;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [candidate, setCandidate] = useState(initialCandidate);
  const [choice, setChoice] = useState(initialChoice);
  const [pending, setPending] = useState<VoteChoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  // Guards against an older fetch landing after a newer one when the moderator
  // moves quickly.
  const requestRef = useRef(0);

  const showCandidate = useCallback(
    async (candidateId: number | null) => {
      const request = ++requestRef.current;
      setError(null);

      if (candidateId === null) {
        setCandidate(null);
        setChoice(null);
        return;
      }

      const [next, ownVote] = await Promise.all([
        getCandidateWithRace(supabase, candidateId),
        supabase
          .from("votes")
          .select("choice")
          .eq("candidate_id", candidateId)
          .eq("voter_id", userId)
          .maybeSingle(),
      ]);

      if (request !== requestRef.current) return;
      setCandidate(next);
      setChoice((ownVote.data?.choice as VoteChoice | undefined) ?? null);
    },
    [supabase, userId],
  );

  useEffect(() => {
    const channel = supabase
      .channel(`meetup-${meetupId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "meetups",
          filter: `id=eq.${meetupId}`,
        },
        (payload) => {
          const next = payload.new as { current_candidate_id: number | null };
          void showCandidate(next.current_candidate_id);
        },
      )
      .subscribe((state) => {
        const next = statusFromChannel(state);
        setStatus(next);
        // A drop may have hidden a change, so re-read on every (re)connect.
        if (next === "live") {
          void getMeetup(supabase).then((meetup) => {
            if (meetup) void showCandidate(meetup.current_candidate_id);
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [meetupId, supabase, showCandidate]);

  const vote = async (next: VoteChoice) => {
    if (!candidate) return;
    setPending(next);
    setError(null);

    const { error: voteError } = await supabase.from("votes").upsert(
      { candidate_id: candidate.id, voter_id: userId, choice: next },
      { onConflict: "candidate_id,voter_id" },
    );

    if (voteError) {
      // The database refuses votes on a candidate that is no longer open,
      // which is what a participant hits if the moderator just moved on.
      setError(
        voteError.code === "42501"
          ? "Voting on this candidate has closed."
          : voteError.message,
      );
    } else {
      setChoice(next);
    }
    setPending(null);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-end">
        <RealtimeStatus status={status} />
      </div>

      {candidate ? (
        <Card>
          <CardHeader>
            <CardDescription>{candidate.race.name}</CardDescription>
            <CardTitle className="text-3xl">{candidate.name}</CardTitle>
            {candidate.party && (
              <CardDescription>{candidate.party}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Should the group recommend this candidate?
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {VOTE_CHOICES.map((value) => (
                <Button
                  key={value}
                  size="lg"
                  variant={choice === value ? "default" : "outline"}
                  disabled={pending !== null}
                  onClick={() => void vote(value)}
                  className={cn("h-14 text-base", choice === value && "ring-2 ring-ring")}
                >
                  {pending === value ? "Saving…" : CHOICE_LABELS[value]}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {choice
                ? `Your vote: ${CHOICE_LABELS[choice]}. You can change it until the moderator moves on.`
                : "You haven't voted on this one yet."}
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Waiting for the moderator</CardTitle>
            <CardDescription>
              Nothing is open for a vote right now. This page updates by itself
              when the next candidate comes up.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
