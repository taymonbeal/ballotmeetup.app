import type { SupabaseClient } from "@supabase/supabase-js";

import type { Meetup, Profile, RaceWithCandidates, Vote } from "@/lib/types";

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
    .select("id, slug, name, current_race_id")
    .eq("slug", MEETUP_SLUG)
    .maybeSingle();

  if (error) throw error;
  return data as Meetup | null;
}

export async function getRaceWithCandidates(
  supabase: SupabaseClient,
  raceId: number,
): Promise<RaceWithCandidates | null> {
  const { data, error } = await supabase
    .from("races")
    .select(
      "id, name, description, sort_order, ballotpedia_url, candidates(id, race_id, name, party, sort_order, ballotpedia_url, website_url, facebook_url)",
    )
    .eq("id", raceId)
    .order("sort_order", { ascending: true, referencedTable: "candidates" })
    .maybeSingle();

  if (error) throw error;
  return data as unknown as RaceWithCandidates | null;
}

export async function getRacesWithCandidates(
  supabase: SupabaseClient,
  meetupId: number,
): Promise<RaceWithCandidates[]> {
  const { data, error } = await supabase
    .from("races")
    .select(
      "id, name, description, sort_order, ballotpedia_url, candidates(id, race_id, name, party, sort_order, ballotpedia_url, website_url, facebook_url)",
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
 * Every vote in a race. Row level security narrows this to the caller's own
 * vote unless the caller is an admin.
 */
export async function getVotes(
  supabase: SupabaseClient,
  raceId: number,
): Promise<Vote[]> {
  const { data, error } = await supabase
    .from("votes")
    .select("race_id, candidate_id, voter_id, choice, updated_at")
    .eq("race_id", raceId);

  if (error) throw error;
  return (data ?? []) as Vote[];
}

export function describeCandidate(candidate: {
  name: string;
  party: string | null;
}): string {
  return candidate.party
    ? `${candidate.name} (${candidate.party})`
    : candidate.name;
}
