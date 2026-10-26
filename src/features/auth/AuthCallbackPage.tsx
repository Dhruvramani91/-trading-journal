import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/layout/Brand';
import { Loader } from '@/components/ui/Loader';
import { useAuthStore } from '@/store/authStore';
import { checkoutPath, checkBillingEntitlement } from '@/lib/billing';
import { needsFirstRunOnboarding } from '@/data/onboardingRepository';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { init } = useAuthStore();

  useEffect(() => {
    // Handle the OAuth callback
    async function handleCallback() {
      try {
        // Re-initialize auth to pick up the new session from URL fragments
        await init();
        const user = useAuthStore.getState().user;
        const entitled = await checkBillingEntitlement(user?.id);
        if (!entitled) {
          setTimeout(() => {
            navigate(checkoutPath(), { replace: true });
          }, 300);
          return;
        }
        const firstRun = await needsFirstRunOnboarding().catch(() => false);
        // Small delay to ensure session is processed
        setTimeout(() => {
          navigate(firstRun ? '/onboarding' : '/dashboard', { replace: true });
        }, 300);
      } catch (err) {
        console.error('Auth callback error:', err);
        navigate('/login?error=callback_failed', { replace: true });
      }
    }

    void handleCallback();
  }, [init, navigate]);

  return (
    <div className="min-h-screen bg-bg-0 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <BrandLogo size="lg" className="mx-auto animate-pulse" />
        <Loader title="Signing you in…" subtitle="Please wait a moment." className="pt-4" />
      </div>
    </div>
  );
}
