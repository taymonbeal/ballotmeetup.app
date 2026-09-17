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
import { getMeetup, getRaceWithCandidates } from "@/lib/meetup";
import type { RaceWithCandidates, Vote, VoteChoice } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** What the participant selected: a specific candidate, or one of the two
 * fixed options. Kept separate from the stored (choice, candidate_id) pair
 * so the UI can highlight exactly one button. */
type Selection =
  | { choice: "candidate"; candidateId: number }
  | { choice: "no_recommendation" }
  | { choice: "abstain" };

function selectionFromVote(vote: Pick<Vote, "choice" | "candidate_id"> | null): Selection | null {
  if (!vote) return null;
  if (vote.choice === "candidate" && vote.candidate_id !== null) {
    return { choice: "candidate", candidateId: vote.candidate_id };
  }
  if (vote.choice === "no_recommendation") return { choice: "no_recommendation" };
  return { choice: "abstain" };
}

export function VotingPanel({
  meetupId,
  userId,
  initialRace,
  initialVote,
}: {
  meetupId: number;
  userId: string;
  initialRace: RaceWithCandidates | null;
  initialVote: Pick<Vote, "choice" | "candidate_id"> | null;
}) {
  const supabase = useMemo(() => createClient(), []);

  const [race, setRace] = useState(initialRace);
  const [selection, setSelection] = useState<Selection | null>(
    selectionFromVote(initialVote),
  );
  const [pending, setPending] = useState<VoteChoice | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  // Guards against an older fetch landing after a newer one when the moderator
  // moves quickly.
  const requestRef = useRef(0);

  const showRace = useCallback(
    async (raceId: number | null) => {
      const request = ++requestRef.current;
      setError(null);

      if (raceId === null) {
        setRace(null);
        setSelection(null);
        return;
      }

      const [nextRace, ownVote] = await Promise.all([
        getRaceWithCandidates(supabase, raceId),
        supabase
          .from("votes")
          .select("choice, candidate_id")
          .eq("race_id", raceId)
          .eq("voter_id", userId)
          .maybeSingle(),
      ]);

      if (request !== requestRef.current) return;
      setRace(nextRace);
      setSelection(selectionFromVote(ownVote.data ?? null));
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
          const next = payload.new as { current_race_id: number | null };
          void showRace(next.current_race_id);
        },
      )
      .subscribe((state) => {
        const next = statusFromChannel(state);
        setStatus(next);
        // A drop may have hidden a change, so re-read on every (re)connect.
        if (next === "live") {
          void getMeetup(supabase).then((meetup) => {
            if (meetup) void showRace(meetup.current_race_id);
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [meetupId, supabase, showRace]);

  const vote = async (next: Selection) => {
    if (!race) return;
    setPending(next.choice === "candidate" ? next.candidateId : next.choice);
    setError(null);

    const { error: voteError } = await supabase.from("votes").upsert(
      {
        race_id: race.id,
        voter_id: userId,
        choice: next.choice,
        candidate_id: next.choice === "candidate" ? next.candidateId : null,
      },
      { onConflict: "race_id,voter_id" },
    );

    if (voteError) {
      // The database refuses votes on a race that is no longer open, which is
      // what a participant hits if the moderator just moved on.
      setError(
        voteError.code === "42501"
          ? "Voting on this race has closed."
          : voteError.message,
      );
    } else {
      setSelection(next);
    }
    setPending(null);
  };

  const isSelected = (candidate: Selection) =>
    selection !== null &&
    selection.choice === candidate.choice &&
    (candidate.choice !== "candidate" ||
      (selection.choice === "candidate" &&
        selection.candidateId === candidate.candidateId));

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-end">
        <RealtimeStatus status={status} />
      </div>

      {race ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{race.name}</CardTitle>
            {race.description && (
              <CardDescription>{race.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Which candidate should the group recommend, if any?
            </p>
            <div className="flex flex-col gap-2">
              {race.candidates.map((candidate) => {
                const option: Selection = {
                  choice: "candidate",
                  candidateId: candidate.id,
                };
                const selected = isSelected(option);
                return (
                  <Button
                    key={candidate.id}
                    size="lg"
                    variant={selected ? "default" : "outline"}
                    disabled={pending !== null}
                    onClick={() => void vote(option)}
                    className={cn(
                      "h-auto justify-start whitespace-normal py-3 text-left text-base",
                      selected && "ring-2 ring-ring",
                    )}
                  >
                    {pending === candidate.id
                      ? "Saving…"
                      : candidate.party
                        ? `${candidate.name} (${candidate.party})`
                        : candidate.name}
                  </Button>
                );
              })}
              <Button
                size="lg"
                variant={isSelected({ choice: "no_recommendation" }) ? "default" : "outline"}
                disabled={pending !== null}
                onClick={() => void vote({ choice: "no_recommendation" })}
                className={cn(
                  "h-auto py-3 text-base",
                  isSelected({ choice: "no_recommendation" }) && "ring-2 ring-ring",
                )}
              >
                {pending === "no_recommendation" ? "Saving…" : "No recommendation"}
              </Button>
              <Button
                size="lg"
                variant={isSelected({ choice: "abstain" }) ? "default" : "outline"}
                disabled={pending !== null}
                onClick={() => void vote({ choice: "abstain" })}
                className={cn(
                  "h-auto py-3 text-base",
                  isSelected({ choice: "abstain" }) && "ring-2 ring-ring",
                )}
              >
                {pending === "abstain" ? "Saving…" : "Abstain"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {selection
                ? "Your vote is saved. You can change it until the moderator moves on."
                : "You haven't voted on this race yet."}
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
              when the next race comes up.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
