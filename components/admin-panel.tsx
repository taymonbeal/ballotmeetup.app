"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  RealtimeStatus,
  statusFromChannel,
  type ConnectionStatus,
} from "@/components/realtime-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { candidateSequence, describeCandidate, getVotes } from "@/lib/meetup";
import {
  tally,
  type Profile,
  type RaceWithCandidates,
  type Vote,
  type VoteChoice,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const CHOICE_LABELS: Record<VoteChoice, string> = {
  yes: "Yes",
  no: "No",
  abstain: "Abstain",
};

export function AdminPanel({
  meetupId,
  races,
  participants,
  initialCurrentCandidateId,
  initialVotes,
}: {
  meetupId: number;
  races: RaceWithCandidates[];
  participants: Profile[];
  initialCurrentCandidateId: number | null;
  initialVotes: Vote[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [currentCandidateId, setCurrentCandidateId] = useState(
    initialCurrentCandidateId,
  );
  const [votes, setVotes] = useState(initialVotes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const sequence = useMemo(() => candidateSequence(races), [races]);
  const currentIndex = sequence.findIndex((c) => c.id === currentCandidateId);
  const current = currentIndex === -1 ? null : sequence[currentIndex];

  // Vote events arrive without knowing which candidate is open, so the handler
  // reads the current one from a ref rather than a stale closure.
  const currentIdRef = useRef(currentCandidateId);
  useEffect(() => {
    currentIdRef.current = currentCandidateId;
  }, [currentCandidateId]);

  const refreshVotes = useCallback(
    async (candidateId: number | null) => {
      if (candidateId === null) {
        setVotes([]);
        return;
      }
      const rows = await getVotes(supabase, candidateId);
      if (currentIdRef.current === candidateId) setVotes(rows);
    },
    [supabase],
  );

  useEffect(() => {
    void refreshVotes(currentCandidateId);
  }, [currentCandidateId, refreshVotes]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-meetup-${meetupId}`)
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
          setCurrentCandidateId(next.current_candidate_id);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "votes" },
        () => {
          void refreshVotes(currentIdRef.current);
        },
      )
      .subscribe((state) => {
        const next = statusFromChannel(state);
        setStatus(next);
        if (next === "live") void refreshVotes(currentIdRef.current);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [meetupId, supabase, refreshVotes]);

  const openVoting = async (candidateId: number | null) => {
    const previous = currentCandidateId;
    setBusy(true);
    setError(null);
    setCurrentCandidateId(candidateId);

    const { error: updateError } = await supabase
      .from("meetups")
      .update({ current_candidate_id: candidateId })
      .eq("id", meetupId);

    if (updateError) {
      setCurrentCandidateId(previous);
      setError(updateError.message);
    }
    setBusy(false);
  };

  const votesByVoter = new Map(votes.map((vote) => [vote.voter_id, vote]));
  const voted = participants.filter((p) => votesByVoter.has(p.id));
  const notVoted = participants.filter((p) => !votesByVoter.has(p.id));
  const counts = tally(votes);

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || currentIndex <= 0}
            onClick={() => void openVoting(sequence[currentIndex - 1].id)}
          >
            Previous
          </Button>
          <Button
            size="sm"
            disabled={busy || currentIndex === sequence.length - 1}
            onClick={() =>
              void openVoting(sequence[currentIndex === -1 ? 0 : currentIndex + 1].id)
            }
          >
            {currentIndex === -1 ? "Start voting" : "Next"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || currentCandidateId === null}
            onClick={() => void openVoting(null)}
          >
            Close voting
          </Button>
        </div>
        <RealtimeStatus status={status} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Ballot</CardTitle>
            <CardDescription>
              Pick the candidate the group is voting on. Everyone&apos;s screen
              follows this.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {races.map((race) => (
              <div key={race.id} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">{race.name}</h3>
                {race.description && (
                  <p className="text-xs text-muted-foreground">
                    {race.description}
                  </p>
                )}
                <div className="flex flex-col gap-1">
                  {race.candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      disabled={busy}
                      onClick={() => void openVoting(candidate.id)}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50",
                        candidate.id === currentCandidateId
                          ? "border-primary bg-accent font-medium"
                          : "border-transparent",
                      )}
                    >
                      <span>{describeCandidate(candidate)}</span>
                      {candidate.id === currentCandidateId && (
                        <Badge>Voting now</Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {current ? describeCandidate(current) : "No vote open"}
            </CardTitle>
            <CardDescription>
              {current
                ? `${voted.length} of ${participants.length} participants have voted`
                : "Choose a candidate to open voting."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              {(["yes", "no", "abstain"] as const).map((choice) => (
                <div key={choice} className="rounded-md border p-3">
                  <div className="text-2xl font-semibold">{counts[choice]}</div>
                  <div className="text-xs text-muted-foreground">
                    {CHOICE_LABELS[choice]}
                  </div>
                </div>
              ))}
            </div>

            {current && counts.counted > 0 && (
              <p className="text-sm">
                {counts.carries
                  ? "A majority of non-abstaining votes says yes: the recommendation carries."
                  : "No majority of non-abstaining votes: no recommendation."}
              </p>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Voted</h3>
                {voted.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nobody yet.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm">
                    {voted.map((participant) => (
                      <li
                        key={participant.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span>{participant.display_name}</span>
                        <Badge variant="secondary">
                          {CHOICE_LABELS[votesByVoter.get(participant.id)!.choice]}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Not yet voted</h3>
                {notVoted.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Everyone&apos;s in.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {notVoted.map((participant) => (
                      <li key={participant.id}>{participant.display_name}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
