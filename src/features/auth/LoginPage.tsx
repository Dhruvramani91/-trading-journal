import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  AlertCircle,
  Sparkles,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/Select';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';

type AuthMode = 'login' | 'signup';

export function LoginPage() {
  const navigate = useNavigate();
  const {
    signUp,
    signInWithPassword,
    signInWithGoogle,
    signInAsGuest,
    loading,
    error,
    clearError,
    user,
  } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const emailConfirmed = window.location.search.includes('confirmed=1');

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Clean up the confirmation URL param after reading it
  useEffect(() => {
    if (emailConfirmed) {
      const url = new URL(window.location.href);
      url.searchParams.delete('confirmed');
      window.history.replaceState({}, '', url);
    }
  }, [emailConfirmed]);

  // Reset the reveal state whenever the form mode changes, so it doesn't
  // carry over (e.g. staying revealed) between Login and Sign Up.
  useEffect(() => {
    setShowPassword(false);
  }, [mode]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      setLocalError('Please enter a valid email and a password (min 6 characters).');
      return;
    }
    setLocalError(null);
    clearError();
    try {
      await signUp(email, password);
      if (!isSupabaseConfigured) {
        navigate('/dashboard');
      }
      // For Supabase: the confirmation email is sent automatically.
      // We show a message so the user knows what to do next.
    } catch (err) {
      setLocalError((err as Error).message || 'Sign-up failed.');
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setLocalError('Please enter your email and password.');
      return;
    }
    setLocalError(null);
    clearError();
    try {
      await signInWithPassword(email, password);
      navigate('/dashboard');
    } catch (err) {
      setLocalError((err as Error).message || 'Invalid email or password.');
    }
  }

  async function handleGoogleSignIn() {
    setLocalError(null);
    clearError();
    try {
      await signInWithGoogle();
      if (!isSupabaseConfigured) {
        navigate('/dashboard');
      }
    } catch (err) {
      setLocalError((err as Error).message || 'Google sign-in failed.');
    }
  }

  async function handleGuestLogin() {
    setLocalError(null);
    clearError();
    await signInAsGuest();
    navigate('/dashboard');
  }

  const emailConfirmationHint =
    isSupabaseConfigured && mode === 'signup'
      ? 'A confirmation email will be sent. Please check your inbox and confirm your email, then log in.'
      : null;

  return (
    <div className="min-h-screen bg-bg-0 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="PrecisionJournal"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-bg-2 border border-line object-contain shadow-sm"
            />
            <span className="text-2xl font-extrabold tracking-tight text-fg">PrecisionJournal</span>
          </Link>
          <p className="text-xs sm:text-sm text-fg-muted">
            {mode === 'signup'
              ? 'Create your account to get started.'
              : 'Sign in to access your journal and analytics.'}
          </p>
        </div>

        {/* Auth Card */}
        <Card className="shadow-pop border-line bg-bg-2">
          <CardBody className="p-6 sm:p-8 space-y-6">
            {/* Error / Confirmation Message */}
            {(localError || error) && (
              <div className="p-3 rounded-lg bg-loss/10 border border-loss/20 text-loss text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{localError || error}</span>
              </div>
            )}

            {emailConfirmed && (
              <div className="p-3 rounded-lg bg-win/10 border border-win/20 text-win text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Email confirmed successfully! You can now log in with your email and password.</span>
              </div>
            )}

            {emailConfirmationHint && (
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs flex items-start gap-2">
                <Mail className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{emailConfirmationHint}</span>
              </div>
            )}

            {/* Auth Mode Toggle */}
            <div className="flex items-center justify-center gap-1 rounded-lg bg-bg-3 p-0.5">
              <button
                type="button"
                onClick={() => { setMode('login'); setLocalError(null); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'login'
                    ? 'bg-bg-2 text-fg shadow-sm'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setLocalError(null); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === 'signup'
                    ? 'bg-bg-2 text-fg shadow-sm'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                Sign Up
              </button>
            </div>

            {mode === 'signup' ? (
              /* ── Sign Up Form ── */
              <form onSubmit={handleSignUp} className="space-y-4">
                <FormField label="Email Address">
                  <div className="relative">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trader@example.com"
                      required
                      className="!pl-9"
                    />
                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-dim" />
                  </div>
                </FormField>

                <FormField label="Password">
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                      required
                      autoComplete="new-password"
                      className="!pl-9 !pr-10"
                    />
                    <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-dim" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-dim hover:text-fg transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormField>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading}
                  className="w-full h-11 font-semibold flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Creating Account…' : 'Create Account'}</span>
                </Button>
              </form>
            ) : (
              /* ── Log In Form ── */
              <form onSubmit={handleLogin} className="space-y-4">
                <FormField label="Email Address">
                  <div className="relative">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trader@example.com"
                      required
                      className="!pl-9"
                    />
                    <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-dim" />
                  </div>
                </FormField>

                <FormField label="Password">
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="!pl-9 !pr-10"
                    />
                    <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-dim" />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-dim hover:text-fg transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormField>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading}
                  className="w-full h-11 font-semibold flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Signing in…' : 'Sign In'}</span>
                </Button>
              </form>
            )}

            {/* Divider */}
            <div className="relative flex items-center justify-center pt-2">
              <div className="border-t border-line w-full" />
              <span className="bg-bg-2 px-3 text-2xs font-semibold uppercase tracking-wider text-fg-dim absolute">
                or continue with
              </span>
            </div>

            {/* Google Sign-in Button */}
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-3 border-line hover:border-line-strong bg-bg-2 text-fg font-medium shadow-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Continue with Google</span>
            </Button>

            {/* Guest / Demo Option */}
            <div className="pt-1">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full text-xs text-fg-muted hover:text-fg flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span>Explore as Guest / Demo Mode</span>
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Back Link */}
        <div className="text-center">
          <Link to="/" className="text-xs text-fg-muted hover:text-fg transition-colors">
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}