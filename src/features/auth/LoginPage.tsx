import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowRight, Lock, Mail, User, AlertCircle, Sparkles } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/Select';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { signInWithPassword, signUpWithPassword, signInAsGuest, loading, error, clearError, user } =
    useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // If already logged in, provide quick access
  if (user) {
    return (
      <div className="min-h-screen bg-bg-0 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center space-y-4">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-accent text-white">
            <TrendingUp className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-fg">Welcome back, {user.name || user.email}!</h2>
          <p className="text-xs text-fg-muted">You are currently logged in.</p>
          <div className="flex justify-center gap-3 pt-2">
            <Button asChild variant="primary" size="md">
              <Link to="/dashboard" className="flex items-center gap-2">
                <span>Enter Journal</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    clearError();

    try {
      if (mode === 'signin') {
        await signInWithPassword(email, password);
      } else {
        await signUpWithPassword(email, password, name);
      }
      navigate('/dashboard');
    } catch (err) {
      setLocalError((err as Error).message || 'Authentication failed');
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
            {mode === 'signin'
              ? 'Sign in to access your trading journal and analytics.'
              : 'Create your trader account to start recording sessions.'}
          </p>
        </div>

        {/* Auth Card */}
        <Card className="shadow-pop border-line bg-white">
          <CardBody className="p-6 sm:p-8 space-y-6">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-bg-4 border border-line">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setLocalError(null);
                  clearError();
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signin'
                    ? 'bg-white text-fg shadow-sm font-bold'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setLocalError(null);
                  clearError();
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-fg shadow-sm font-bold'
                    : 'text-fg-muted hover:text-fg'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Message */}
            {(localError || error) && (
              <div className="p-3 rounded-lg bg-loss/10 border border-loss/20 text-loss text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{localError || error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <FormField label="Full Name">
                  <div className="relative">
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Trader"
                      required
                      className="pl-9"
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-dim" />
                  </div>
                </FormField>
              )}

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

              <FormField label="Password">
                <div className="relative">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="pl-9"
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-dim" />
                </div>
              </FormField>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full h-10 mt-2 font-semibold"
              >
                {loading ? 'Processing…' : mode === 'signin' ? 'Sign In to Journal' : 'Create Free Account'}
              </Button>
            </form>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-line w-full" />
              <span className="bg-white px-3 text-2xs font-semibold uppercase tracking-wider text-fg-dim absolute">
                or
              </span>
            </div>

            {/* Guest / Demo Access */}
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full h-10 flex items-center justify-center gap-2 border-line hover:border-accent/40"
            >
              <Sparkles className="h-4 w-4 text-accent" />
              <span>Explore as Guest / Demo Mode</span>
            </Button>
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
