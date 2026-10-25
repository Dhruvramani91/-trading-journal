import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { PageLoader } from '@/components/ui/Loader';
import { useEffect, useState } from 'react';
import { getCachedBillingEntitlement, cacheBillingEntitlement } from '@/lib/billingEntitlementCache';

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
    return <PageLoader title="Loading your workspace…" className="min-h-dvh bg-bg-0" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

type EntitlementCheck = { userId: string; loading: boolean; entitled: boolean; error: boolean };

/** Workspace access is derived from the server-owned billing row, never client storage. */
export function RequireSubscription() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [check, setCheck] = useState<EntitlementCheck>({ userId: '', loading: true, entitled: false, error: false });

  useEffect(() => {
    let active = true;
    let requestPending = false;
    const userId = user?.id;
    const client = supabase;
    if (!userId || !client) return () => { active = false; };

    const refreshEntitlement = (force = false) => {
      const cached = !force ? getCachedBillingEntitlement(userId) : null;
      if (cached) {
        setCheck({ userId, loading: false, entitled: cached.entitled, error: false });
        return;
      }
      if (requestPending) return;
      requestPending = true;

      setCheck((previous) => previous.userId === userId
        ? { ...previous, loading: false }
        : { userId, loading: true, entitled: false, error: false });

      void client.rpc('current_user_has_billing_entitlement')
        .then(({ data, error }) => {
          requestPending = false;
          if (!active) return;
          if (error) {
            setCheck({ userId, loading: false, entitled: false, error: true });
            return;
          }
          cacheBillingEntitlement(userId, data === true);
          setCheck({ userId, loading: false, entitled: data === true, error: false });
        }, () => {
          requestPending = false;
          if (active) setCheck({ userId, loading: false, entitled: false, error: true });
        });
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible' && !getCachedBillingEntitlement(userId)) refreshEntitlement(true);
    };

    refreshEntitlement();
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      active = false;
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [user?.id]);

  // Keep account profile and subscription management accessible for billing recovery.
  if (location.pathname === '/profile' || location.pathname === '/manage-subscription') return <Outlet />;
  if (check.userId !== user?.id || check.loading) return <PageLoader title="Loading your workspace…" className="min-h-dvh bg-bg-0" />;
  if (check.error) return <Navigate to="/manage-subscription?billing=unavailable" replace />;
  if (!check.entitled) return <Navigate to="/checkout?plan=monthly" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
