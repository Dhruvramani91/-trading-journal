import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Loader } from '@/components/ui/Loader';

/**
 * Guards every workspace route (everything rendered under AppShell).
 *
 * - A missing / misconfigured Supabase setup must NEVER grant access. There is
 *   no auth backend, so no session can exist and nobody is authenticated —
 *   visitors are sent to /login instead of being let through.
 * - When Supabase is configured, wait for the session restore to
 *   finish (`initialized`) and send unauthenticated visitors to /login.
 */
export function RequireAuth() {
  const { user, initialized } = useAuthStore();

  // Fail CLOSED: a missing auth backend is never a reason to bypass auth.
  if (!isSupabaseConfigured) {
    return <Navigate to="/login" replace />;
  }

  if (!initialized) {
    return <Loader title="Loading your workspace…" className="min-h-screen bg-bg-0" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
