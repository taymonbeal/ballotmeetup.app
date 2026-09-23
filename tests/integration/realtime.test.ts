import type { RealtimePostgresUpdatePayload, SupabaseClient } from "@supabase/supabase-js";
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

/** Resolves with the first matching postgres_changes UPDATE payload, or rejects on timeout. */
function waitForUpdate(
  client: SupabaseClient,
  channelName: string,
  table: string,
  filter: string,
  timeoutMs = 10_000,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      void client.removeChannel(channel);
      reject(new Error(`Timed out waiting for a Realtime UPDATE on ${table} (${filter})`));
    }, timeoutMs);

    const channel = client
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table, filter },
        (payload: RealtimePostgresUpdatePayload<Record<string, unknown>>) => {
          clearTimeout(timer);
          void client.removeChannel(channel);
          resolve(payload.new);
        },
      )
      .subscribe();
  });
}

describe.skipIf(skip)("Realtime delivery", () => {
  const admin = skip ? null! : adminClient();
  let fixture: Fixture;
  let moderator: { id: string; client: SupabaseClient };
  let participant: { id: string; client: SupabaseClient };

  beforeAll(async () => {
    fixture = await createFixture(admin);

    const mod = await createTestUser(admin, "Realtime Test Moderator");
    moderator = { id: mod.id, client: mod.client };
    const { error } = await admin.from("profiles").update({ is_admin: true }).eq("id", moderator.id);
    if (error) throw error;

    participant = await createTestUser(admin, "Realtime Test Participant").then((u) => ({
      id: u.id,
      client: u.client,
    }));
  });

  afterAll(async () => {
    await deleteTestUser(admin, moderator.id);
    await deleteTestUser(admin, participant.id);
    await deleteFixture(admin, fixture.meetupId);
  });

  it("a participant sees the moderator open a race, live", async () => {
    const received = waitForUpdate(
      participant.client,
      `meetup-${fixture.meetupId}`,
      "meetups",
      `id=eq.${fixture.meetupId}`,
    );

    const { error } = await moderator.client
      .from("meetups")
      .update({ current_race_id: fixture.race1Id })
      .eq("id", fixture.meetupId);
    expect(error).toBeNull();

    const payload = await received;
    expect(payload.current_race_id).toBe(fixture.race1Id);
  });

  it("a moderator sees a participant's vote arrive, live", async () => {
    const received = waitForUpdate(
      moderator.client,
      `admin-meetup-${fixture.meetupId}`,
      "votes",
      `race_id=eq.${fixture.race1Id}`,
    );

    // The row has to exist before it can be UPDATEd; insert once, then change
    // it, which is exactly what the app's upsert-based voting flow does on a
    // second vote and is easy to distinguish from the initial INSERT here.
    const { error: insertError } = await participant.client.from("votes").insert({
      race_id: fixture.race1Id,
      voter_id: participant.id,
      choice: "candidate",
      candidate_id: fixture.race1CandidateAId,
    });
    expect(insertError).toBeNull();

    const { error: updateError } = await participant.client
      .from("votes")
      .update({ choice: "abstain", candidate_id: null })
      .eq("race_id", fixture.race1Id)
      .eq("voter_id", participant.id);
    expect(updateError).toBeNull();

    const payload = await received;
    expect(payload.voter_id).toBe(participant.id);
    expect(payload.choice).toBe("abstain");
  });

  it("a participant does not receive another participant's vote row", async () => {
    // votes_select_own_or_admin means the participant's own subscription is
    // authorized only for their own rows; a second participant's insert must
    // not show up on it. To make sure this is actually proving isolation and
    // not just "the channel never received anything at all", the same
    // channel also has to positively receive the participant's own insert.
    const other = await createTestUser(admin, "Second Participant");
    try {
      // Race 1 already has votes from earlier tests (and a unique
      // (race_id, voter_id) per voter); open race 2, which neither test user
      // has voted in yet, for this one.
      const { error: openError } = await moderator.client
        .from("meetups")
        .update({ current_race_id: fixture.race2Id })
        .eq("id", fixture.meetupId);
      expect(openError).toBeNull();

      const seenVoterIds: string[] = [];
      const channel = participant.client
        .channel(`participant-isolation-${fixture.meetupId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "votes", filter: `race_id=eq.${fixture.race2Id}` },
          (payload: { new: { voter_id: string } }) => {
            seenVoterIds.push(payload.new.voter_id);
          },
        )
        .subscribe();
      await new Promise((resolve) => setTimeout(resolve, 500)); // let the join settle

      const { error: otherError } = await other.client.from("votes").insert({
        race_id: fixture.race2Id,
        voter_id: other.id,
        choice: "abstain",
        candidate_id: null,
      });
      expect(otherError).toBeNull();

      const { error: ownError } = await participant.client.from("votes").insert({
        race_id: fixture.race2Id,
        voter_id: participant.id,
        choice: "candidate",
        candidate_id: fixture.race2CandidateId,
      });
      expect(ownError).toBeNull();

      // Poll rather than a single fixed wait: resolve as soon as the own
      // vote is seen, but keep watching for the whole window in case the
      // (incorrect) foreign event is just running late.
      const deadline = Date.now() + 8_000;
      while (Date.now() < deadline && !seenVoterIds.includes(participant.id)) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000)); // grace period
      await participant.client.removeChannel(channel);

      expect(seenVoterIds).toContain(participant.id); // the channel is genuinely live
      expect(seenVoterIds).not.toContain(other.id); // but never sees someone else's row
    } finally {
      await deleteTestUser(admin, other.id);
    }
  });
});
