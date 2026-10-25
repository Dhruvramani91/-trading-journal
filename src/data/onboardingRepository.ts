import { supabase } from '@/lib/supabase';

// Existing accounts predate this flow and should go straight to their workspace.
// New accounts created from this release onward get a one-time first-run setup.
const ONBOARDING_RELEASE_AT = Date.parse('2026-10-25T18:42:10.000Z');
const ONBOARDING_VERSION = 1;

export async function needsFirstRunOnboarding(): Promise<boolean> {
  if (!supabase) return false;

  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(`Could not check first-run setup: ${error.message}`);
  const user = data.user;
  if (!user) return false;

  const metadata = user.user_metadata ?? {};
  if (Number(metadata.onboarding_completed_version) >= ONBOARDING_VERSION) return false;

  return metadata.onboarding_required === true || Date.parse(user.created_at) >= ONBOARDING_RELEASE_AT;
}

export async function completeFirstRunOnboarding(): Promise<void> {
  if (!supabase) return;

  const { data, error: getUserError } = await supabase.auth.getUser();
  if (getUserError) throw new Error(`Could not save first-run setup: ${getUserError.message}`);
  if (!data.user) throw new Error('Sign in to finish setting up your journal.');

  const { error } = await supabase.auth.updateUser({
    data: {
      ...data.user.user_metadata,
      onboarding_completed_version: ONBOARDING_VERSION,
      onboarding_completed_at: new Date().toISOString(),
    },
  });
  if (error) throw new Error(`Could not save first-run setup: ${error.message}`);
}
