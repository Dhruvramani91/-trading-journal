import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Loader } from '@/components/ui/Loader';
import { useEffect, useState } from 'react';

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

type EntitlementCheck = { userId: string; pathname: string; loading: boolean; entitled: boolean; error: boolean };

/** Workspace access is derived from the server-owned billing row, never client storage. */
export function RequireSubscription() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [check, setCheck] = useState<EntitlementCheck>({ userId: '', pathname: '', loading: true, entitled: false, error: false });

  useEffect(() => {
    let active = true;
    const userId = user?.id;
    const client = supabase;
    if (!userId || !client) return () => { active = false; };

    const refreshEntitlement = () => {
      setCheck((previous) => ({
        ...previous,
        userId,
        pathname: location.pathname,
        loading: true,
      }));

      void client.rpc('current_user_has_billing_entitlement')
        .then(({ data, error }) => {
          if (!active) return;
          if (error) {
            setCheck({ userId, pathname: location.pathname, loading: false, entitled: false, error: true });
            return;
          }
          setCheck({ userId, pathname: location.pathname, loading: false, entitled: data === true, error: false });
        }, () => {
          if (active) setCheck({ userId, pathname: location.pathname, loading: false, entitled: false, error: true });
        });
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refreshEntitlement();
    };

    refreshEntitlement();
    window.addEventListener('focus', refreshEntitlement);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    const refreshInterval = window.setInterval(refreshWhenVisible, 60_000);

    return () => {
      active = false;
      window.removeEventListener('focus', refreshEntitlement);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.clearInterval(refreshInterval);
    };
  }, [user?.id, location.pathname]);

  // Keep profile accessible for billing recovery and subscription management.
  if (location.pathname === '/profile') return <Outlet />;
  if (check.userId !== user?.id || check.pathname !== location.pathname || check.loading) return <Loader title="Checking subscription…" className="min-h-screen bg-bg-0" />;
  if (check.error) return <Navigate to="/profile?billing=unavailable" replace />;
  if (!check.entitled) return <Navigate to="/checkout?plan=monthly" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
