import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  adminClient,
  createFixture,
  createTestUser,
  deleteFixture,
  deleteTestUser,
  requireLocalSupabase,
  type Fixture,
} from "./helpers";

const skip = requireLocalSupabase();

// These tests intentionally run in declaration order and share one fixture:
// they walk through the same open-a-race / vote / move-on lifecycle the app
// itself goes through, rather than each resetting state from scratch.
describe.skipIf(skip)("row level security and constraints on votes/meetups", () => {
  const admin = skip ? null! : adminClient();
  let fixture: Fixture;
  let moderator: { id: string; client: SupabaseClient };
  let participant: { id: string; client: SupabaseClient };

  beforeAll(async () => {
    fixture = await createFixture(admin);

    const mod = await createTestUser(admin, "Test Moderator");
    moderator = { id: mod.id, client: mod.client };
    const { error } = await admin
      .from("profiles")
      .update({ is_admin: true })
      .eq("id", moderator.id);
    if (error) throw error;

    const part = await createTestUser(admin, "Test Participant");
    participant = { id: part.id, client: part.client };
  });

  afterAll(async () => {
    await deleteTestUser(admin, moderator.id);
    await deleteTestUser(admin, participant.id);
    await deleteFixture(admin, fixture.meetupId);
  });

  it("a non-moderator cannot open a race for voting", async () => {
    await participant.client
      .from("meetups")
      .update({ current_race_id: fixture.race1Id })
      .eq("id", fixture.meetupId);

    const { data } = await admin
      .from("meetups")
      .select("current_race_id")
      .eq("id", fixture.meetupId)
      .single();
    expect(data?.current_race_id).toBeNull();
  });

  it("a moderator can open a race for voting", async () => {
    const { error } = await moderator.client
      .from("meetups")
      .update({ current_race_id: fixture.race1Id })
      .eq("id", fixture.meetupId);
    expect(error).toBeNull();

    const { data } = await admin
      .from("meetups")
      .select("current_race_id")
      .eq("id", fixture.meetupId)
      .single();
    expect(data?.current_race_id).toBe(fixture.race1Id);
  });

  it("a candidate vote must carry a candidate_id", async () => {
    const { error } = await participant.client.from("votes").insert({
      race_id: fixture.race1Id,
      voter_id: participant.id,
      choice: "candidate",
      candidate_id: null,
    });
    expect(error?.code).toBe("23514"); // check constraint
  });

  it("an abstain vote must not carry a candidate_id", async () => {
    const { error } = await participant.client.from("votes").insert({
      race_id: fixture.race1Id,
      voter_id: participant.id,
      choice: "abstain",
      candidate_id: fixture.race1CandidateAId,
    });
    expect(error?.code).toBe("23514");
  });

  it("a vote's candidate must actually belong to the race being voted on", async () => {
    const { error } = await participant.client.from("votes").insert({
      race_id: fixture.race1Id,
      voter_id: participant.id,
      choice: "candidate",
      // This candidate belongs to race 2, not race 1.
      candidate_id: fixture.race2CandidateId,
    });
    expect(error?.code).toBe("23503"); // composite foreign key
  });

  it("voting is rejected once nothing is open", async () => {
    const { error: closeError } = await moderator.client
      .from("meetups")
      .update({ current_race_id: null })
      .eq("id", fixture.meetupId);
    expect(closeError).toBeNull();

    const { error } = await participant.client.from("votes").insert({
      race_id: fixture.race1Id,
      voter_id: participant.id,
      choice: "no_recommendation",
      candidate_id: null,
    });
    expect(error?.code).toBe("42501"); // RLS

    // Reopen it for the tests below.
    const { error: reopenError } = await moderator.client
      .from("meetups")
      .update({ current_race_id: fixture.race1Id })
      .eq("id", fixture.meetupId);
    expect(reopenError).toBeNull();
  });

  it("a participant cannot vote as someone else", async () => {
    const { error } = await participant.client.from("votes").insert({
      race_id: fixture.race1Id,
      voter_id: moderator.id,
      choice: "no_recommendation",
      candidate_id: null,
    });
    expect(error?.code).toBe("42501");
  });

  it("a participant can vote on the open race, for a candidate", async () => {
    const { data, error } = await participant.client
      .from("votes")
      .insert({
        race_id: fixture.race1Id,
        voter_id: participant.id,
        choice: "candidate",
        candidate_id: fixture.race1CandidateAId,
      })
      .select("choice, candidate_id")
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({ choice: "candidate", candidate_id: fixture.race1CandidateAId });
  });

  it("changing a vote upserts and correctly clears candidate_id", async () => {
    const { data: before } = await admin
      .from("votes")
      .select("updated_at")
      .eq("race_id", fixture.race1Id)
      .eq("voter_id", participant.id)
      .single();

    const { error } = await participant.client.from("votes").upsert(
      {
        race_id: fixture.race1Id,
        voter_id: participant.id,
        choice: "no_recommendation",
        candidate_id: null,
      },
      { onConflict: "race_id,voter_id" },
    );
    expect(error).toBeNull();

    const { data: after } = await admin
      .from("votes")
      .select("choice, candidate_id, updated_at")
      .eq("race_id", fixture.race1Id)
      .eq("voter_id", participant.id)
      .single();
    expect(after?.choice).toBe("no_recommendation");
    expect(after?.candidate_id).toBeNull();
    expect(after?.updated_at).not.toBe(before?.updated_at);
  });

  it("a participant sees only their own vote; a moderator sees everyone's", async () => {
    const { error: modVoteError } = await moderator.client.from("votes").insert({
      race_id: fixture.race1Id,
      voter_id: moderator.id,
      choice: "candidate",
      candidate_id: fixture.race1CandidateBId,
    });
    expect(modVoteError).toBeNull();

    const { data: participantView } = await participant.client
      .from("votes")
      .select("voter_id")
      .eq("race_id", fixture.race1Id);
    expect(participantView?.map((v) => v.voter_id).sort()).toEqual([participant.id]);

    const { data: moderatorView } = await moderator.client
      .from("votes")
      .select("voter_id")
      .eq("race_id", fixture.race1Id);
    expect(moderatorView?.map((v) => v.voter_id).sort()).toEqual(
      [participant.id, moderator.id].sort(),
    );
  });

  it("moving to a different race freezes votes on the one just closed", async () => {
    const { error } = await moderator.client
      .from("meetups")
      .update({ current_race_id: fixture.race2Id })
      .eq("id", fixture.meetupId);
    expect(error).toBeNull();

    // The participant's vote on race 1 must not be editable any more.
    const { data: updateResult } = await participant.client
      .from("votes")
      .update({ choice: "abstain", candidate_id: null })
      .eq("race_id", fixture.race1Id)
      .eq("voter_id", participant.id)
      .select();
    expect(updateResult).toEqual([]); // 0 rows: RLS hid the row from the update

    const { data: stillFrozen } = await admin
      .from("votes")
      .select("choice")
      .eq("race_id", fixture.race1Id)
      .eq("voter_id", participant.id)
      .single();
    expect(stillFrozen?.choice).toBe("no_recommendation"); // unchanged

    // But voting on the newly-open race works.
    const { error: newVoteError } = await participant.client.from("votes").insert({
      race_id: fixture.race2Id,
      voter_id: participant.id,
      choice: "candidate",
      candidate_id: fixture.race2CandidateId,
    });
    expect(newVoteError).toBeNull();
  });
});
