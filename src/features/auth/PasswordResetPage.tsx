import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, LockKeyhole } from 'lucide-react';

import { MIN_PASSWORD_LENGTH, useAuthStore } from '../../store/authStore';

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

    if (password.length < MIN_PASSWORD_LENGTH) {
      setLocalError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
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
      <div className="min-h-screen bg-bg-0 text-fg flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-line bg-bg-2 p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-bg-3">
              <CheckCircle2
                className="h-9 w-9 text-fg-muted"
                strokeWidth={2}
              />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Password changed successfully
            </h1>

            <p className="mt-3 text-sm leading-6 text-fg-muted">
              Your ThePrecisionLab password has been updated.
              You can now log in using your new password.
            </p>

            <button
              type="button"
              onClick={handleGoToLogin}
              className="mt-7 w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-fg transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
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
    <div className="min-h-screen bg-bg-0 text-fg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-line bg-bg-2 p-8">
          <Link
            to="/login"
            className="mb-8 inline-flex items-center gap-2 rounded-md text-sm text-fg-muted transition hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>

          <div className="mb-7">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-bg-3">
              <LockKeyhole
                className="h-6 w-6 text-fg-muted"
                strokeWidth={1.8}
              />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Reset your password
            </h1>

            <p className="mt-2 text-sm leading-6 text-fg-muted">
              Enter a new password for your ThePrecisionLab account.
            </p>
          </div>

          {displayedError && (
            <div role="alert" className="mb-5 rounded-xl border border-line bg-bg-3 px-4 py-3 text-sm text-fg">
              {displayedError}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-fg"
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
                className="w-full rounded-xl border border-line bg-bg-1 px-4 py-3 text-sm text-fg outline-none placeholder:text-fg-dim transition focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-fg"
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
                className="w-full rounded-xl border border-line bg-bg-1 px-4 py-3 text-sm text-fg outline-none placeholder:text-fg-dim transition focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-fg transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Changing Password...' : 'Reset Password'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-fg-muted">
            Your old password will not be displayed or retrieved.
          </p>
        </div>
      </div>
    </div>
  );
}
