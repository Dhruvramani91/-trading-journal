import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth, RequireSubscription } from './RequireAuth';

const h = vi.hoisted(() => ({
  isSupabaseConfigured: true as boolean,
  state: { user: null as unknown, initialized: true as boolean },
  supabase: null as unknown,
}));

vi.mock('@/lib/supabase', () => ({
  get isSupabaseConfigured() {
    return h.isSupabaseConfigured;
  },
  get supabase() {
    return h.supabase;
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => h.state,
}));

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<div data-testid="login">login</div>} />
        <Route element={<RequireAuth />}>
          <Route
            path="/dashboard"
            element={<div data-testid="workspace">workspace</div>}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function renderSubscriptionGuard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/profile" element={<div data-testid="profile">profile</div>} />
        <Route element={<RequireSubscription />}>
          <Route path="/dashboard" element={<div data-testid="workspace">workspace</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function makeSubscriptionQuery(result: { data: unknown; error: null }) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return query;
}

describe('RequireAuth', () => {
  beforeEach(() => {
    h.isSupabaseConfigured = true;
    h.state = { user: null, initialized: true };
    h.supabase = null;
  });

  it('fails CLOSED when Supabase is not configured (never grants access)', () => {
    h.isSupabaseConfigured = false;
    // Even a "signed in"-looking state must not open the workspace.
    h.state = { user: { id: 'u1', email: 'a@b.c', name: 'A' }, initialized: true };

    renderGuard();

    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('workspace')).toBeNull();
  });

  it('redirects to /login when configured but unauthenticated', () => {
    h.isSupabaseConfigured = true;
    h.state = { user: null, initialized: true };

    renderGuard();

    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('workspace')).toBeNull();
  });

  it('renders the workspace only for an authenticated session', () => {
    h.isSupabaseConfigured = true;
    h.state = { user: { id: 'u1', email: 'a@b.c', name: 'A' }, initialized: true };

    renderGuard();

    expect(screen.getByTestId('workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('login')).toBeNull();
  });

  it('renders nothing while the session restore is still pending', () => {
    h.isSupabaseConfigured = true;
    h.state = { user: null, initialized: false };

    renderGuard();

    expect(screen.queryByTestId('login')).toBeNull();
    expect(screen.queryByTestId('workspace')).toBeNull();
  });
});

describe('RequireSubscription refresh behavior', () => {
  it('rechecks the database entitlement when the tab regains focus', async () => {
    h.state = { user: { id: 'u1', email: 'a@b.c', name: 'A' }, initialized: true };
    const query = makeSubscriptionQuery({
      data: [{ plan_key: 'monthly', status: 'active', charge_at: null, current_end: Math.floor(Date.now() / 1000) + 3600, cancel_at_cycle_end: false }],
      error: null,
    });
    h.supabase = { from: vi.fn(() => query) };

    renderSubscriptionGuard();
    expect(await screen.findByTestId('workspace')).toBeInTheDocument();
    expect(query.order).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('focus'));
    await waitFor(() => expect(query.order).toHaveBeenCalledTimes(2));
  });

  it('keeps a cancelled monthly trial accessible until its original charge date', async () => {
    h.state = { user: { id: 'u1', email: 'a@b.c', name: 'A' }, initialized: true };
    const query = makeSubscriptionQuery({
      data: [
        { plan_key: 'monthly', status: 'created', trial_days: 0, trial_claimed_at: null, charge_at: null },
        {
          plan_key: 'monthly',
          status: 'cancelled',
          charge_at: Math.floor(Date.now() / 1000) + 6 * 24 * 60 * 60,
          current_start: null,
          current_end: null,
          cancel_at_cycle_end: false,
          trial_days: 7,
          trial_claimed_at: new Date().toISOString(),
        },
      ],
      error: null,
    });
    h.supabase = { from: vi.fn(() => query) };

    renderSubscriptionGuard();

    expect(await screen.findByTestId('workspace')).toBeInTheDocument();
  });
});
