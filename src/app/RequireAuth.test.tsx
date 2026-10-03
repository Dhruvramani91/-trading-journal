import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';

const h = vi.hoisted(() => ({
  isSupabaseConfigured: true as boolean,
  state: { user: null as unknown, initialized: true as boolean },
}));

vi.mock('@/lib/supabase', () => ({
  get isSupabaseConfigured() {
    return h.isSupabaseConfigured;
  },
  supabase: null,
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

describe('RequireAuth', () => {
  beforeEach(() => {
    h.isSupabaseConfigured = true;
    h.state = { user: null, initialized: true };
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
