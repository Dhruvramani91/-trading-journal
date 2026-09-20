import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ArrowRight,
  Mail,
  AlertCircle,
  Sparkles,
  KeyRound,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/Select';
import { useAuthStore } from '@/store/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';

export function LoginPage() {
  const navigate = useNavigate();
  const {
    sendOtp,
    verifyOtp,
    signInWithGoogle,
    signInAsGuest,
    loading,
    error,
    otpSent,
    clearError,
    resetOtp,
    user,
  } = useAuthStore();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Focus first OTP input when step changes
  useEffect(() => {
    if (otpSent && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [otpSent]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    setLocalError(null);
    clearError();

    try {
      await sendOtp(email);
      // If local-first (no Supabase), sendOtp automatically logs in
      if (!isSupabaseConfigured) {
        navigate('/dashboard');
      } else {
        setResendCooldown(60);
      }
    } catch (err) {
      setLocalError((err as Error).message || 'Failed to send verification code.');
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const token = otp.join('');
    if (token.length !== 6) {
      setLocalError('Please enter the full 6-digit code.');
      return;
    }
    setLocalError(null);
    clearError();

    try {
      await verifyOtp(email, token);
      navigate('/dashboard');
    } catch (err) {
      setLocalError((err as Error).message || 'Invalid or expired code.');
    }
  }

  function handleOtpChange(index: number, val: string) {
    // Only accept numeric digits
    const cleaned = val.replace(/[^0-9]/g, '');
    const newOtp = [...otp];

    if (cleaned.length > 1) {
      // Handle paste
      const pasted = cleaned.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || '';
      }
      setOtp(newOtp);
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = cleaned.slice(-1);
    setOtp(newOtp);

    // Auto-advance
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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

  return (
    <div className="min-h-screen bg-bg-0 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-white shadow-sm">
              <TrendingUp className="h-6 w-6" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-fg">TradingLog</span>
          </Link>
          <p className="text-xs sm:text-sm text-fg-muted">
            {otpSent
              ? `Enter the 6-digit code sent to ${email}`
              : 'Sign in to access your journal and analytics.'}
          </p>
        </div>

        {/* Auth Card */}
        <Card className="shadow-pop border-line bg-white">
          <CardBody className="p-6 sm:p-8 space-y-6">
            {/* Error Message */}
            {(localError || error) && (
              <div className="p-3 rounded-lg bg-loss/10 border border-loss/20 text-loss text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{localError || error}</span>
              </div>
            )}

            {!otpSent ? (
              /* Step 1: Choose Login Method */
              <div className="space-y-5">
                {/* Google Sign-in Button */}
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full h-11 flex items-center justify-center gap-3 border-line hover:border-line-strong bg-white text-fg font-medium shadow-sm"
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
                  <span>Continue with Google</span>
                </Button>

                {/* Divider */}
                <div className="relative flex items-center justify-center">
                  <div className="border-t border-line w-full" />
                  <span className="bg-white px-3 text-2xs font-semibold uppercase tracking-wider text-fg-dim absolute">
                    or with email code
                  </span>
                </div>

                {/* Email OTP Form */}
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <FormField label="Email Address">
                    <div className="relative">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="trader@example.com"
                        required
                        className="pl-9"
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-dim" />
                    </div>
                  </FormField>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={loading}
                    className="w-full h-11 font-semibold flex items-center justify-center gap-2"
                  >
                    <KeyRound className="h-4 w-4" />
                    <span>{loading ? 'Sending Code…' : 'Send Verification Code'}</span>
                  </Button>
                </form>

                {/* Guest / Demo Option */}
                <div className="pt-2">
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
              </div>
            ) : (
              /* Step 2: Enter 6-Digit OTP */
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="text-center space-y-1">
                  <div className="h-10 w-10 mx-auto rounded-full bg-win/10 text-win flex items-center justify-center mb-2">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-fg">Verification code sent</p>
                  <p className="text-xs text-fg-dim">
                    Check your inbox for the 6-digit code.
                  </p>
                </div>

                {/* 6 Digit Input Boxes */}
                <div className="flex justify-center gap-2 sm:gap-2.5">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-11 h-13 text-center text-xl font-bold font-mono rounded-xl border border-line bg-bg-4 text-fg focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/30 transition-all outline-none"
                    />
                  ))}
                </div>

                {/* Verify Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full h-11 font-semibold flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Verifying…' : 'Verify & Enter Journal'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                {/* Resend / Change email options */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      resetOtp();
                      setLocalError(null);
                    }}
                    className="text-fg-muted hover:text-fg transition-colors"
                  >
                    Change email
                  </button>

                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="text-accent hover:underline disabled:text-fg-dim disabled:no-underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                    <span>
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </span>
                  </button>
                </div>
              </form>
            )}
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
