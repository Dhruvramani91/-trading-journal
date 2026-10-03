import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Guards every workspace route (everything rendered under AppShell).
 *
 * - When Supabase is not configured there is no auth backend at all,
 *   so no redirect is enforced and local/dev access is unchanged.
 * - When Supabase is configured, wait for the session restore to
 *   finish (`initialized`) and send unauthenticated visitors to /login.
 */
export function RequireAuth() {
  const { user, initialized } = useAuthStore();

  if (!isSupabaseConfigured) {
    return <Outlet />;
  }

  if (!initialized) {
    return null;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}