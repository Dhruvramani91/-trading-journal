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
  ArrowLeft,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { BrandLogo } from '@/components/layout/Brand';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/Select';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';

type AuthMode = 'login' | 'signup';

// Ascending candlesticks: the one deliberate visual moment on this page.
// Bars grow in on mount; respects prefers-reduced-motion.
function TradeChart({ mounted, reduceMotion }: { mounted: boolean; reduceMotion: boolean }) {
  const bars = [
    { x: 20, w: 22, h: 60, up: true },
    { x: 54, w: 22, h: 40, up: false },
    { x: 88, w: 22, h: 92, up: true },
    { x: 122, w: 22, h: 70, up: true },
    { x: 156, w: 22, h: 50, up: false },
    { x: 190, w: 22, h: 118, up: true },
    { x: 224, w: 22, h: 150, up: true },
  ];
  const maxH = 150;

  return (
    <svg viewBox="0 0 280 170" className="w-full max-w-[280px]" aria-hidden="true">
      {bars.map((bar, i) => {
        const y = maxH - bar.h + 10;
        const grown = mounted || reduceMotion;
        return (
          <g key={bar.x}>
            <line
              x1={bar.x + bar.w / 2}
              x2={bar.x + bar.w / 2}
              y1={y - 8}
              y2={y + bar.h + 8}
              className={bar.up ? 'text-win' : 'text-loss'}
              stroke="currentColor"
              strokeOpacity={0.5}
              strokeWidth={2}
              style={{
                opacity: grown ? 0.5 : 0,
                transition: reduceMotion ? 'none' : `opacity 400ms ease ${i * 70 + 120}ms`,
              }}
            />
            <rect
              x={bar.x}
              y={y}
              width={bar.w}
              height={bar.h}
              rx={3}
              className={bar.up ? 'text-win' : 'text-loss'}
              fill="currentColor"
              fillOpacity={bar.up ? 0.85 : 0.55}
              style={{
                transformBox: 'fill-box',
                transformOrigin: 'bottom',
                transform: grown ? 'scaleY(1)' : 'scaleY(0)',
                transition: reduceMotion ? 'none' : `transform 550ms cubic-bezier(0.22,1,0.36,1) ${i * 70}ms`,
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();

  const {
    signUp,
    signInWithPassword,
    signInWithGoogle,
    signInAsGuest,
    sendPasswordReset,
    signOut,
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
  const [signupSuccess, setSignupSuccess] = useState(false);

  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const emailConfirmed = window.location.search.includes('confirmed=1');

  // --------------------------------------------------
  // MOUNT — trigger the hero chart's one-time grow-in
  // --------------------------------------------------

  useEffect(() => {
    setReduceMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // --------------------------------------------------
  // HANDLE AUTHENTICATED USERS
  // --------------------------------------------------

  useEffect(() => {
    if (!user) return;

    if (signupSuccess) {
      async function finishEmailConfirmation() {
        await signOut();

        setSignupSuccess(false);
        setMode('login');
        setPassword('');
        setLocalError(null);
        clearError();

        navigate('/login', { replace: true });
      }

      void finishEmailConfirmation();
      return;
    }

    navigate('/dashboard', { replace: true });
  }, [user, signupSuccess, signOut, clearError, navigate]);

  // --------------------------------------------------
  // HANDLE PASSWORD RESET COMPLETION FROM ANOTHER TAB
  // --------------------------------------------------

  useEffect(() => {
    const handlePasswordResetComplete = (event: StorageEvent) => {
      if (
        event.key !== 'precisionjournal:password-reset-complete' ||
        !event.newValue
      ) {
        return;
      }

      setForgotPassword(false);
      setResetEmailSent(false);
      setPassword('');
      setLocalError(null);
      clearError();

      navigate('/login', { replace: true });
    };

    window.addEventListener('storage', handlePasswordResetComplete);

    return () => {
      window.removeEventListener('storage', handlePasswordResetComplete);
    };
  }, [clearError, navigate]);

  // --------------------------------------------------
  // CLEAN CONFIRMATION URL
  // --------------------------------------------------

  useEffect(() => {
    if (emailConfirmed) {
      const url = new URL(window.location.href);
      url.searchParams.delete('confirmed');
      window.history.replaceState({}, '', url);
    }
  }, [emailConfirmed]);

  // --------------------------------------------------
  // RESET PASSWORD VISIBILITY WHEN MODE CHANGES
  // --------------------------------------------------

  useEffect(() => {
    setShowPassword(false);
  }, [mode, forgotPassword]);

  // --------------------------------------------------
  // SIGN UP
  // --------------------------------------------------

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || password.length < 6) {
      setLocalError('Enter a valid email and a password with at least 6 characters.');
      return;
    }

    setLocalError(null);
    clearError();

    try {
      await signUp(email, password);

      if (!isSupabaseConfigured) {
        navigate('/dashboard');
        return;
      }

      setPassword('');
      setSignupSuccess(true);
    } catch (err) {
      setLocalError((err as Error).message || 'Sign-up failed.');
    }
  }

  function backToLoginFromSuccess() {
    setSignupSuccess(false);
    setMode('login');
    setLocalError(null);
    setPassword('');
  }

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password) {
      setLocalError('Enter your email and password.');
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

  // --------------------------------------------------
  // FORGOT PASSWORD — EMAIL RESET LINK ONLY, NO OTP
  // --------------------------------------------------

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      setLocalError('Enter your email address.');
      return;
    }

    setLocalError(null);
    clearError();

    try {
      await sendPasswordReset(email);
      setResetEmailSent(true);
    } catch (err) {
      setLocalError((err as Error).message || 'Failed to send reset email.');
    }
  }

  function openForgotPassword() {
    setForgotPassword(true);
    setResetEmailSent(false);
    setLocalError(null);
    clearError();
    setPassword('');
  }

  function backFromForgotPassword() {
    setForgotPassword(false);
    setResetEmailSent(false);
    setLocalError(null);
    clearError();
  }

  // --------------------------------------------------
  // GOOGLE / GUEST
  // --------------------------------------------------

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

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-bg-0 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-5xl rounded-[28px] border border-line shadow-pop overflow-hidden grid grid-cols-1 md:grid-cols-[1.05fr_1fr] bg-bg-2">

        {/* ================================================= */}
        {/* LEFT — brand panel, fixed dark regardless of theme */}
        {/* ================================================= */}

        <div className="hidden md:flex relative flex-col justify-between overflow-hidden bg-[#0a0a0c] p-10 min-h-[620px]">
          <div
            className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-accent/25 blur-3xl"
            aria-hidden="true"
          />

          <Link
            to="/"
            className="relative inline-flex items-center gap-3"
          >
            <div className="h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <img
                src="/logo-white.png"
                alt="PrecisionJournal"
                className="h-12 w-12 object-contain"
              />
            </div>

            <span className="text-3xl font-bold tracking-tight text-white">
              PrecisionJournal
            </span>
          </Link>

          <div className="relative space-y-4">
            <h1 className="text-3xl font-semibold leading-snug text-white max-w-xs">
              Trade with discipline.
              <br />
              Review with data.
            </h1>
            <p className="text-sm text-white/60 max-w-xs">
              Log every trade, spot your patterns, and turn a messy week into
              a clear edge.
            </p>

            <div className="pt-4">
              <TradeChart mounted={mounted} reduceMotion={reduceMotion} />
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* RIGHT — active form */}
        {/* ================================================= */}

        <div className="p-6 sm:p-10 flex flex-col justify-center space-y-5">

          <Link
            to="/"
            className="md:hidden inline-flex items-center gap-2.5 mb-1"
          >
            <BrandLogo size="md" />
            <span className="text-lg font-bold tracking-tight text-fg">
              PrecisionJournal
            </span>
          </Link>

          {(localError || error) && (
            <div className="p-3 rounded-lg bg-loss/10 border border-loss/20 text-loss text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{localError || error}</span>
            </div>
          )}

          {emailConfirmed && !forgotPassword && !signupSuccess && (
            <div className="p-3 rounded-lg bg-win/10 border border-win/20 text-win text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Email confirmed. You can log in now.</span>
            </div>
          )}

          {signupSuccess ? (

            /* SIGNUP SUCCESS */

            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 border border-accent/20">
                <Mail className="h-5 w-5 text-accent" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold text-fg">Check your inbox</h2>
                <p className="text-sm text-fg-muted">
                  We sent a confirmation link to{' '}
                  <span className="font-medium text-fg">{email}</span>. Confirm
                  your email, then come back and log in.
                </p>
              </div>

              <p className="text-xs text-fg-dim">
                Didn't get it? Check your spam folder.
              </p>

              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={backToLoginFromSuccess}
                className="w-full h-11 font-semibold"
              >
                Back to log in
              </Button>
            </div>

          ) : forgotPassword ? (

            /* FORGOT PASSWORD */

            <div className="space-y-4">
              {!resetEmailSent ? (
                <>
                  <button
                    type="button"
                    onClick={backFromForgotPassword}
                    className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to log in
                  </button>

                  <div className="space-y-1.5">
                    <h2 className="text-xl font-semibold text-fg">
                      Forgot your password?
                    </h2>
                    <p className="text-sm text-fg-muted">
                      Enter your email and we'll send you a reset link.
                    </p>
                  </div>

                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <FormField label="Email address">
                      <div className="relative">
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="trader@example.com"
                          required
                          autoComplete="email"
                          className="!pl-9"
                        />
                        <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-dim" />
                      </div>
                    </FormField>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={loading}
                      className="w-full h-11 font-semibold flex items-center justify-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      <span>{loading ? 'Sending…' : 'Send reset link'}</span>
                    </Button>
                  </form>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-win/10 border border-win/20">
                    <CheckCircle2 className="h-6 w-6 text-win" />
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-xl font-semibold text-fg">Reset email sent</h2>
                    <p className="text-sm text-fg-muted">
                      We sent a password reset link to{' '}
                      <span className="font-medium text-fg">{email}</span>.
                      Check your inbox to create a new password.
                    </p>
                  </div>

                  <p className="text-xs text-fg-dim">
                    Didn't receive it? Check your spam folder.
                  </p>

                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    onClick={backFromForgotPassword}
                    className="w-full h-11 font-semibold"
                  >
                    Back to log in
                  </Button>
                </div>
              )}
            </div>

          ) : (

            /* LOGIN / SIGN UP — single active form */

            <>
              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold text-fg">
                  {mode === 'signup' ? 'Create your account' : 'Welcome back'}
                </h2>
                <p className="text-sm text-fg-muted">
                  {mode === 'signup'
                    ? 'Start tracking your edge in minutes.'
                    : 'Sign in to access your journal and analytics.'}
                </p>
              </div>

              <form
                onSubmit={mode === 'signup' ? handleSignUp : handleLogin}
                className="space-y-4"
              >
                <FormField label="Email address">
                  <div className="relative">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trader@example.com"
                      required
                      autoComplete="email"
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
                      placeholder="enter your password"
                      minLength={mode === 'signup' ? 6 : undefined}
                      required
                      autoComplete={
                        mode === 'signup' ? 'new-password' : 'current-password'
                      }
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
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormField>

                {mode === 'login' && (
                  <div className="flex justify-end -mt-1">
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="text-xs font-medium text-accent hover:text-fg transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading}
                  className="w-full h-11 font-semibold"
                >
                  {loading
                    ? mode === 'signup'
                      ? 'Creating account…'
                      : 'Signing in…'
                    : mode === 'signup'
                      ? 'Create account'
                      : 'Sign in'}
                </Button>
              </form>

              <p className="text-center text-xs text-fg-muted">
                {mode === 'signup' ? (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setLocalError(null);
                        clearError();
                      }}
                      className="font-semibold text-accent hover:text-fg transition-colors"
                    >
                      Log in
                    </button>
                  </>
                ) : (
                  <>
                    New to PrecisionJournal?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setLocalError(null);
                        clearError();
                      }}
                      className="font-semibold text-accent hover:text-fg transition-colors"
                    >
                      Create an account
                    </button>
                  </>
                )}
              </p>

              <div className="relative flex items-center justify-center py-1">
                <div className="border-t border-line w-full" />
                <span className="bg-bg-2 px-3 text-xs text-fg-dim absolute">
                  or continue with
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="h-11 flex items-center justify-center gap-2 border-line hover:border-line-strong bg-bg-2 text-fg font-medium"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Google</span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={handleGuestLogin}
                  disabled={loading}
                  className="h-11 flex items-center justify-center gap-2 border-line hover:border-line-strong bg-bg-2 text-fg-muted hover:text-fg font-medium"
                >
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span>Guest demo</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}