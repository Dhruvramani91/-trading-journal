import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, LockKeyhole } from 'lucide-react';

import { useAuthStore } from '../../store/authStore';

export default function PasswordResetPage() {
  const navigate = useNavigate();

  const {
    updatePassword,
    loading,
    error,
    clearError,
    signOut,
  } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleResetPassword = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setLocalError('');
    clearError();

    if (!password || !confirmPassword) {
      setLocalError('Please enter your new password.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    try {
      await updatePassword(password);

      // Tell any existing Login tab/window that the reset is complete.
      localStorage.setItem(
        'precisionjournal:password-reset-complete',
        Date.now().toString()
      );

      setPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch {
      // The authStore already provides the error message.
    }
  };

  const handleGoToLogin = async () => {
    // Important:
    // The recovery link creates a temporary Supabase session.
    // Sign out first so LoginPage doesn't immediately redirect
    // back to the dashboard.
    await signOut();

    navigate('/login', { replace: true });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#08090d] text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-[#101116] p-8 shadow-2xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2
                className="h-9 w-9 text-emerald-400"
                strokeWidth={2}
              />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Password changed successfully
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/60">
              Your PrecisionJournal password has been updated.
              You can now log in using your new password.
            </p>

            <button
              type="button"
              onClick={handleGoToLogin}
              className="mt-7 w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayedError = localError || error;

  return (
    <div className="min-h-screen bg-[#08090d] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-[#101116] p-8 shadow-2xl">
          <Link
            to="/login"
            className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>

          <div className="mb-7">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
              <LockKeyhole
                className="h-6 w-6 text-white/80"
                strokeWidth={1.8}
              />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Reset your password
            </h1>

            <p className="mt-2 text-sm leading-6 text-white/50">
              Enter a new password for your PrecisionJournal account.
            </p>
          </div>

          {displayedError && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {displayedError}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                New Password
              </label>

              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                autoComplete="new-password"
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition focus:border-white/25 focus:bg-white/[0.07] disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-white/80"
              >
                Confirm Password
              </label>

              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                autoComplete="new-password"
                disabled={loading}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition focus:border-white/25 focus:bg-white/[0.07] disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Changing Password...' : 'Reset Password'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-white/35">
            Your old password will not be displayed or retrieved.
          </p>
        </div>
      </div>
    </div>
  );
}