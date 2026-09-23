import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * These tests exercise real RLS policies, constraints, and Realtime against
 * a real Postgres instance — they need Supabase actually running. Point them
 * at a *local* instance (`supabase start`), never at a hosted project: they
 * create and delete users and data, and a local instance is the only place
 * that's safe to do freely. See ../../.env.test.example for setup.
 */
export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasLocalSupabase = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY,
);

const skipReason =
  "Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.test.local " +
  "(run `supabase start`, then `supabase status -o env`) to run this against a local Supabase instance.";

/** Use in a describe.skipIf/it.skipIf; logs why once per file if skipped. */
export function requireLocalSupabase() {
  if (!hasLocalSupabase) {
    console.warn(skipReason);
  }
  return !hasLocalSupabase;
}

/** Full-privilege client: bypasses RLS. Only ever used for test setup/teardown. */
export function adminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("adminClient() called without local Supabase configured");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** An ordinary client, as the app itself would create — subject to RLS. */
export function anonClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("anonClient() called without local Supabase configured");
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const TEST_PASSWORD = "correct-horse-battery-staple-9x";

/**
 * Creates a signed-up, pre-confirmed test user via the Admin API (so this
 * never sends real email or hits a rate limit), and returns a client already
 * signed in as them — exactly the shape the browser app has.
 */
export async function createTestUser(
  admin: SupabaseClient,
  displayName: string,
): Promise<{ id: string; email: string; client: SupabaseClient }> {
  const email = `test-${randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (signInError) {
    throw new Error(`Failed to sign in test user: ${signInError.message}`);
  }

  return { id: data.user.id, email, client };
}

/** Deletes a test user. Cascades to their profile and votes. */
export async function deleteTestUser(admin: SupabaseClient, userId: string) {
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Failed to delete test user: ${error.message}`);
}

export type Fixture = {
  meetupId: number;
  race1Id: number;
  race1CandidateAId: number;
  race1CandidateBId: number;
  race2Id: number;
  race2CandidateId: number;
};

/**
 * Creates a throwaway meetup with two races, isolated from any seeded data
 * and from other test files, so tests never depend on or disturb each other.
 */
export async function createFixture(admin: SupabaseClient): Promise<Fixture> {
  const slug = `test-${randomUUID()}`;

  const { data: meetup, error: meetupError } = await admin
    .from("meetups")
    .insert({ slug, name: "Test meetup" })
    .select("id")
    .single();
  if (meetupError || !meetup) {
    throw new Error(`Failed to create fixture meetup: ${meetupError?.message}`);
  }
  const meetupId = meetup.id as number;

  const { data: race1, error: race1Error } = await admin
    .from("races")
    .insert({ meetup_id: meetupId, name: "Race 1", sort_order: 1 })
    .select("id")
    .single();
  if (race1Error || !race1) {
    throw new Error(`Failed to create fixture race 1: ${race1Error?.message}`);
  }

  const { data: race1Candidates, error: race1CandidatesError } = await admin
    .from("candidates")
    .insert([
      { race_id: race1.id, name: "Race 1 Candidate A", sort_order: 1 },
      { race_id: race1.id, name: "Race 1 Candidate B", sort_order: 2 },
    ])
    .select("id")
    .order("sort_order", { ascending: true });
  if (race1CandidatesError || !race1Candidates || race1Candidates.length !== 2) {
    throw new Error(`Failed to create fixture race 1 candidates: ${race1CandidatesError?.message}`);
  }

  const { data: race2, error: race2Error } = await admin
    .from("races")
    .insert({ meetup_id: meetupId, name: "Race 2", sort_order: 2 })
    .select("id")
    .single();
  if (race2Error || !race2) {
    throw new Error(`Failed to create fixture race 2: ${race2Error?.message}`);
  }

  const { data: race2Candidate, error: race2CandidateError } = await admin
    .from("candidates")
    .insert({ race_id: race2.id, name: "Race 2 Candidate", sort_order: 1 })
    .select("id")
    .single();
  if (race2CandidateError || !race2Candidate) {
    throw new Error(`Failed to create fixture race 2 candidate: ${race2CandidateError?.message}`);
  }

  return {
    meetupId,
    race1Id: race1.id as number,
    race1CandidateAId: race1Candidates[0].id as number,
    race1CandidateBId: race1Candidates[1].id as number,
    race2Id: race2.id as number,
    race2CandidateId: race2Candidate.id as number,
  };
}

/** Deletes the fixture meetup. Cascades to its races, candidates, and votes. */
export async function deleteFixture(admin: SupabaseClient, meetupId: number) {
  const { error } = await admin.from("meetups").delete().eq("id", meetupId);
  if (error) throw new Error(`Failed to delete fixture meetup: ${error.message}`);
}
