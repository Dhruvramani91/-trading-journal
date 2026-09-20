import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { init } = useAuthStore();

  useEffect(() => {
    // Handle the OAuth callback
    async function handleCallback() {
      try {
        // Re-initialize auth to pick up the new session from URL fragments
        await init();
        // Small delay to ensure session is processed
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 500);
      } catch (err) {
        console.error('Auth callback error:', err);
        navigate('/login?error=callback_failed', { replace: true });
      }
    }

    void handleCallback();
  }, [init, navigate]);

  return (
    <div className="min-h-screen bg-bg-0 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-12 w-12 mx-auto rounded-2xl bg-accent text-white flex items-center justify-center animate-pulse">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-fg">Signing you in...</p>
          <p className="text-xs text-fg-muted">Please wait a moment.</p>
        </div>
      </div>
    </div>
  );
}