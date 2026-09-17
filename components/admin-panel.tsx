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
import { getVotes } from "@/lib/meetup";
import {
  tallyRace,
  type Profile,
  type RaceWithCandidates,
  type Vote,
} from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function describeVote(
  vote: Pick<Vote, "choice" | "candidate_id">,
  race: RaceWithCandidates,
): string {
  if (vote.choice === "no_recommendation") return "No recommendation";
  if (vote.choice === "abstain") return "Abstain";
  const candidate = race.candidates.find((c) => c.id === vote.candidate_id);
  return candidate?.name ?? "Unknown candidate";
}

export function AdminPanel({
  meetupId,
  races,
  participants,
  initialCurrentRaceId,
  initialVotes,
}: {
  meetupId: number;
  races: RaceWithCandidates[];
  participants: Profile[];
  initialCurrentRaceId: number | null;
  initialVotes: Vote[];
}) {
  const supabase = useMemo(() => createClient(), []);

  const [currentRaceId, setCurrentRaceId] = useState(initialCurrentRaceId);
  const [votes, setVotes] = useState(initialVotes);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  const currentIndex = races.findIndex((r) => r.id === currentRaceId);
  const current = currentIndex === -1 ? null : races[currentIndex];

  // Vote events arrive without knowing which race is open, so the handler
  // reads the current one from a ref rather than a stale closure.
  const currentIdRef = useRef(currentRaceId);
  useEffect(() => {
    currentIdRef.current = currentRaceId;
  }, [currentRaceId]);

  const refreshVotes = useCallback(
    async (raceId: number | null) => {
      if (raceId === null) {
        setVotes([]);
        return;
      }
      const rows = await getVotes(supabase, raceId);
      if (currentIdRef.current === raceId) setVotes(rows);
    },
    [supabase],
  );

  useEffect(() => {
    void refreshVotes(currentRaceId);
  }, [currentRaceId, refreshVotes]);

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
          const next = payload.new as { current_race_id: number | null };
          setCurrentRaceId(next.current_race_id);
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

  const openVoting = async (raceId: number | null) => {
    const previous = currentRaceId;
    setBusy(true);
    setError(null);
    setCurrentRaceId(raceId);

    const { error: updateError } = await supabase
      .from("meetups")
      .update({ current_race_id: raceId })
      .eq("id", meetupId);

    if (updateError) {
      setCurrentRaceId(previous);
      setError(updateError.message);
    }
    setBusy(false);
  };

  const votesByVoter = new Map(votes.map((vote) => [vote.voter_id, vote]));
  const voted = participants.filter((p) => votesByVoter.has(p.id));
  const notVoted = participants.filter((p) => !votesByVoter.has(p.id));
  const counts = current ? tallyRace(votes) : null;

  const winnerLabel = (() => {
    if (!counts || !current) return null;
    if (counts.counted === 0) return null;
    const winner = counts.winner;
    if (winner === null) {
      return "No majority of non-abstaining votes: no recommendation.";
    }
    if (winner.type === "no_recommendation") {
      return "A majority of non-abstaining votes says no recommendation.";
    }
    const winningCandidate = current.candidates.find(
      (c) => c.id === winner.candidateId,
    );
    return `A majority of non-abstaining votes recommends ${winningCandidate?.name ?? "this candidate"}.`;
  })();

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || currentIndex <= 0}
            onClick={() => void openVoting(races[currentIndex - 1].id)}
          >
            Previous
          </Button>
          <Button
            size="sm"
            disabled={busy || currentIndex === races.length - 1}
            onClick={() =>
              void openVoting(races[currentIndex === -1 ? 0 : currentIndex + 1].id)
            }
          >
            {currentIndex === -1 ? "Start voting" : "Next"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || currentRaceId === null}
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
              Pick the race the group is voting on. Everyone&apos;s screen
              follows this.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {races.map((race) => (
              <button
                key={race.id}
                type="button"
                disabled={busy}
                onClick={() => void openVoting(race.id)}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50",
                  race.id === currentRaceId
                    ? "border-primary bg-accent font-medium"
                    : "border-transparent",
                )}
              >
                <span>{race.name}</span>
                {race.id === currentRaceId && <Badge>Voting now</Badge>}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{current ? current.name : "No vote open"}</CardTitle>
            <CardDescription>
              {current
                ? `${voted.length} of ${participants.length} participants have voted`
                : "Choose a race to open voting."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {current && counts && (
              <div className="flex flex-col gap-2">
                {current.candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <span className="text-sm">
                      {candidate.party
                        ? `${candidate.name} (${candidate.party})`
                        : candidate.name}
                    </span>
                    <span className="text-lg font-semibold">
                      {counts.byCandidate.get(candidate.id) ?? 0}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm">No recommendation</span>
                  <span className="text-lg font-semibold">
                    {counts.noRecommendation}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3 text-muted-foreground">
                  <span className="text-sm">Abstain</span>
                  <span className="text-lg font-semibold">{counts.abstain}</span>
                </div>
              </div>
            )}

            {winnerLabel && <p className="text-sm">{winnerLabel}</p>}

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
                          {current
                            ? describeVote(votesByVoter.get(participant.id)!, current)
                            : ""}
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
