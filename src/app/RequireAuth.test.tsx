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

import { invalidateBillingEntitlement } from '@/lib/billingEntitlementCache';

describe('RequireSubscription refresh behavior', () => {
  it('rechecks the database entitlement when the tab regains focus', async () => {
    h.state = { user: { id: 'u1', email: 'a@b.c', name: 'A' }, initialized: true };
    const rpcMock = vi.fn().mockResolvedValue({ data: true, error: null });
    h.supabase = { rpc: rpcMock };

    renderSubscriptionGuard();
    expect(await screen.findByTestId('workspace')).toBeInTheDocument();
    expect(rpcMock).toHaveBeenCalledTimes(1);

    invalidateBillingEntitlement('u1');
    window.dispatchEvent(new Event('focus'));
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(2));
  });

  it('keeps entitlement accessible when server reports entitlement', async () => {
    h.state = { user: { id: 'u1', email: 'a@b.c', name: 'A' }, initialized: true };
    h.supabase = { rpc: vi.fn().mockResolvedValue({ data: true, error: null }) };

    renderSubscriptionGuard();

    expect(await screen.findByTestId('workspace')).toBeInTheDocument();
  });
});
