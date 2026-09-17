import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Candidate,
  CandidateWithRace,
  Meetup,
  Profile,
  RaceWithCandidates,
  Vote,
} from "@/lib/types";

/**
 * This iteration supports exactly one meetup. When we add more, this constant
 * becomes a route parameter.
 */
export const MEETUP_SLUG = "ma-2026-general";

export async function getMeetup(
  supabase: SupabaseClient,
): Promise<Meetup | null> {
  const { data, error } = await supabase
    .from("meetups")
    .select("id, slug, name, current_candidate_id")
    .eq("slug", MEETUP_SLUG)
    .maybeSingle();

  if (error) throw error;
  return data as Meetup | null;
}

export async function getCandidateWithRace(
  supabase: SupabaseClient,
  candidateId: number,
): Promise<CandidateWithRace | null> {
  const { data, error } = await supabase
    .from("candidates")
    .select(
      "id, race_id, name, party, sort_order, race:races(id, name, description, sort_order)",
    )
    .eq("id", candidateId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  // PostgREST returns the embedded row as an object for a to-one relationship,
  // but types it loosely; narrow it here rather than at every call site.
  return data as unknown as CandidateWithRace;
}

export async function getRacesWithCandidates(
  supabase: SupabaseClient,
  meetupId: number,
): Promise<RaceWithCandidates[]> {
  const { data, error } = await supabase
    .from("races")
    .select(
      "id, name, description, sort_order, candidates(id, race_id, name, party, sort_order)",
    )
    .eq("meetup_id", meetupId)
    .order("sort_order", { ascending: true })
    .order("sort_order", { ascending: true, referencedTable: "candidates" });

  if (error) throw error;
  return (data ?? []) as unknown as RaceWithCandidates[];
}

/** Everyone who has signed up. Becomes a per-meetup attendee list later. */
export async function getParticipants(
  supabase: SupabaseClient,
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, is_admin")
    .order("display_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

/**
 * Every vote on a candidate. Row level security narrows this to the caller's
 * own vote unless the caller is an admin.
 */
export async function getVotes(
  supabase: SupabaseClient,
  candidateId: number,
): Promise<Vote[]> {
  const { data, error } = await supabase
    .from("votes")
    .select("candidate_id, voter_id, choice, updated_at")
    .eq("candidate_id", candidateId);

  if (error) throw error;
  return (data ?? []) as Vote[];
}

/** Flattens races into the order the moderator steps through candidates. */
export function candidateSequence(races: RaceWithCandidates[]): Candidate[] {
  return races.flatMap((race) => race.candidates);
}

export function describeCandidate(candidate: {
  name: string;
  party: string | null;
}): string {
  return candidate.party ? `${candidate.name} (${candidate.party})` : candidate.name;
}
