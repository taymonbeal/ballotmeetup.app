export type VoteChoice = "yes" | "no" | "abstain";

export const VOTE_CHOICES: VoteChoice[] = ["yes", "no", "abstain"];

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
};

export type Race = {
  id: number;
  name: string;
  description: string | null;
  sort_order: number;
};

/** A candidate together with the race it belongs to, for display. */
export type CandidateWithRace = Candidate & { race: Race };

export type RaceWithCandidates = Race & { candidates: Candidate[] };

export type Meetup = {
  id: number;
  slug: string;
  name: string;
  current_candidate_id: number | null;
};

export type Vote = {
  candidate_id: number;
  voter_id: string;
  choice: VoteChoice;
  updated_at: string;
};

/** Yes/no/abstain counts and whether the recommendation carries. */
export type Tally = {
  yes: number;
  no: number;
  abstain: number;
  /** Votes that count toward the majority: abstentions are excluded. */
  counted: number;
  carries: boolean;
};

export function tally(votes: Pick<Vote, "choice">[]): Tally {
  const yes = votes.filter((v) => v.choice === "yes").length;
  const no = votes.filter((v) => v.choice === "no").length;
  const abstain = votes.filter((v) => v.choice === "abstain").length;
  const counted = yes + no;
  return { yes, no, abstain, counted, carries: yes * 2 > counted };
}
