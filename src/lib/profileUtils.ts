/**
 * profileUtils — read/write the user's editable profile (profiles table, RLS-scoped
 * to auth.uid()). DOM-free domain logic; safe to port to mobile.
 *
 * Mirrors the upsert pattern in purposeUtils.ts. Writes also sync
 * auth user_metadata.full_name, since much of the app reads the display name from
 * there (e.g. Profile header fallback, Header).
 */
import { supabase } from "@/integrations/supabase/client";

export interface ProfileRow {
  id: string;
  full_name: string | null;
  bio: string | null;
  location: string | null;
  created_at: string | null;
}

export interface ProfileEditInput {
  fullName: string;
  bio: string;
  location: string;
}

const PROFILE_COLUMNS = "id, full_name, bio, location, created_at";

/** Load the signed-in user's profile row. Returns null when missing (RLS empty). */
export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("Could not load profile:", error.message);
    return null;
  }
  return data as ProfileRow | null;
}

/** Upsert the editable fields, then keep auth metadata's full_name in sync. */
export async function saveProfile(
  userId: string,
  input: ProfileEditInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fullName = input.fullName.trim();

  const payload = {
    id: userId,
    full_name: fullName || null,
    bio: input.bio.trim() || null,
    location: input.location.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(payload as never, { onConflict: "id" });

  if (error) return { ok: false, error: error.message };

  if (fullName) {
    const { error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (authError) return { ok: false, error: authError.message };
  }

  return { ok: true };
}
