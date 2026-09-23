export type VoteChoice = "candidate" | "no_recommendation" | "abstain";

export type Profile = {
  id: string;
  display_name: string;
  is_admin: boolean;
};

export type Candidate = {
  id: number;
  race_id: number;
  name: string;
  party: string | null;
  sort_order: number;
  ballotpedia_url: string | null;
  website_url: string | null;
  facebook_url: string | null;
};

export type Race = {
  id: number;
  name: string;
  description: string | null;
  sort_order: number;
  ballotpedia_url: string | null;
};

export type RaceWithCandidates = Race & { candidates: Candidate[] };

export type Meetup = {
  id: number;
  slug: string;
  name: string;
  current_race_id: number | null;
};

export type Vote = {
  race_id: number;
  /** Set only when choice is "candidate". */
  candidate_id: number | null;
  voter_id: string;
  choice: VoteChoice;
  updated_at: string;
};

/**
 * The result of one candidate's tally, or of "no recommendation" — either
 * can win a race.
 */
export type RaceOutcome =
  | { type: "candidate"; candidateId: number }
  | { type: "no_recommendation" };

/** Vote counts for one race, and which outcome (if any) has a majority. */
export type RaceTally = {
  /** candidate_id -> number of votes for that candidate. */
  byCandidate: Map<number, number>;
  noRecommendation: number;
  abstain: number;
  /** Votes that count toward a majority: abstentions are excluded. */
  counted: number;
  /** Null when nobody has a majority of the counted votes. */
  winner: RaceOutcome | null;
};

export function tallyRace(
  votes: Pick<Vote, "choice" | "candidate_id">[],
): RaceTally {
  const byCandidate = new Map<number, number>();
  let noRecommendation = 0;
  let abstain = 0;

  for (const vote of votes) {
    if (vote.choice === "candidate" && vote.candidate_id !== null) {
      byCandidate.set(
        vote.candidate_id,
        (byCandidate.get(vote.candidate_id) ?? 0) + 1,
      );
    } else if (vote.choice === "no_recommendation") {
      noRecommendation += 1;
    } else {
      abstain += 1;
    }
  }

  const counted =
    noRecommendation + [...byCandidate.values()].reduce((a, b) => a + b, 0);

  let winner: RaceOutcome | null = null;
  if (counted > 0) {
    if (noRecommendation * 2 > counted) {
      winner = { type: "no_recommendation" };
    } else {
      for (const [candidateId, count] of byCandidate) {
        if (count * 2 > counted) {
          winner = { type: "candidate", candidateId };
          break;
        }
      }
    }
  }

  return { byCandidate, noRecommendation, abstain, counted, winner };
}
