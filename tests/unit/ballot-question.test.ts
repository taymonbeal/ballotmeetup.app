import { describe, expect, it } from "vitest";

import { isBallotQuestion, type RaceWithCandidates } from "@/lib/types";

const race = (...names: string[]): RaceWithCandidates => ({
  id: 1,
  name: "Race",
  description: null,
  sort_order: 1,
  ballotpedia_url: null,
  candidates: names.map((name, i) => ({
    id: i + 1,
    race_id: 1,
    name,
    party: null,
    sort_order: i + 1,
    ballotpedia_url: null,
    website_url: null,
    facebook_url: null,
  })),
});

describe("isBallotQuestion", () => {
  it("recognizes a Yes/No race in either order", () => {
    expect(isBallotQuestion(race("Yes", "No"))).toBe(true);
    expect(isBallotQuestion(race("No", "Yes"))).toBe(true);
  });

  it("rejects races with real candidates", () => {
    expect(isBallotQuestion(race("Alice Smith", "Bob Jones"))).toBe(false);
    expect(isBallotQuestion(race("Yes"))).toBe(false);
    expect(isBallotQuestion(race("Yes", "No", "Other"))).toBe(false);
    expect(isBallotQuestion(race())).toBe(false);
  });
});
