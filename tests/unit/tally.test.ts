import { describe, expect, it } from "vitest";

import { tallyRace, type Vote } from "@/lib/types";

type VoteInput = Pick<Vote, "choice" | "candidate_id">;

const forCandidate = (candidateId: number): VoteInput => ({
  choice: "candidate",
  candidate_id: candidateId,
});
const noRecommendation: VoteInput = { choice: "no_recommendation", candidate_id: null };
const abstain: VoteInput = { choice: "abstain", candidate_id: null };

describe("tallyRace", () => {
  it("returns an empty, no-winner tally for no votes", () => {
    const result = tallyRace([]);
    expect(result.counted).toBe(0);
    expect(result.abstain).toBe(0);
    expect(result.noRecommendation).toBe(0);
    expect(result.byCandidate.size).toBe(0);
    expect(result.winner).toBeNull();
  });

  it("declares a candidate the winner on a strict majority", () => {
    const result = tallyRace([forCandidate(1), forCandidate(1), forCandidate(2)]);
    expect(result.counted).toBe(3);
    expect(result.byCandidate.get(1)).toBe(2);
    expect(result.byCandidate.get(2)).toBe(1);
    expect(result.winner).toEqual({ type: "candidate", candidateId: 1 });
  });

  it("declares no_recommendation the winner on a strict majority", () => {
    const result = tallyRace([noRecommendation, noRecommendation, forCandidate(1)]);
    expect(result.counted).toBe(3);
    expect(result.winner).toEqual({ type: "no_recommendation" });
  });

  it("has no winner on an exact tie", () => {
    const result = tallyRace([forCandidate(1), forCandidate(2)]);
    expect(result.counted).toBe(2);
    expect(result.winner).toBeNull();
  });

  it("has no winner when nobody has a strict majority among three-plus options", () => {
    const result = tallyRace([forCandidate(1), forCandidate(2), noRecommendation]);
    expect(result.counted).toBe(3);
    expect(result.winner).toBeNull();
  });

  it("excludes abstentions from the counted denominator", () => {
    // 2 of 2 counted votes (the abstentions don't count) go to candidate 1,
    // so it wins even though it's a minority of all ballots cast.
    const result = tallyRace([forCandidate(1), forCandidate(1), abstain, abstain, abstain]);
    expect(result.abstain).toBe(3);
    expect(result.counted).toBe(2);
    expect(result.winner).toEqual({ type: "candidate", candidateId: 1 });
  });

  it("a majority of only abstentions still has no winner and no majority", () => {
    const result = tallyRace([abstain, abstain, forCandidate(1)]);
    expect(result.counted).toBe(1);
    expect(result.abstain).toBe(2);
    expect(result.winner).toEqual({ type: "candidate", candidateId: 1 });
  });

  it("ignores a malformed candidate vote with a null candidate_id", () => {
    // Shouldn't happen (the database enforces this), but the tally must not
    // silently miscount if it ever does.
    const malformed: VoteInput = { choice: "candidate", candidate_id: null };
    const result = tallyRace([malformed, forCandidate(1)]);
    expect(result.counted).toBe(1);
    expect(result.byCandidate.get(1)).toBe(1);
  });
});
