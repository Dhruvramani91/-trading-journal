import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth },
  isSupabaseConfigured: true,
}));

vi.mock('@/store/tradesStore', () => ({
  reloadTradesForCurrentUser: vi.fn().mockResolvedValue(undefined),
  clearTradesForCurrentUser: vi.fn(),
}));

import { LoginPage } from './LoginPage';
import { useAuthStore } from '@/store/authStore';

function renderLoginPage() {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>,
  );
}

function enterEmail(email: string) {
  fireEvent.change(screen.getByPlaceholderText('trader@example.com'), {
    target: { value: email },
  });
}

describe('LoginPage authentication feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
    useAuthStore.setState({
      user: null,
      loading: false,
      error: null,
      otpSent: false,
      initialized: false,
    });
  });

  it.each([
    ['wrong password', 'Invalid login credentials'],
    ['unknown email', 'User not found'],
  ])('shows the same login error for %s', async (_case, authError) => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new Error(authError),
    });
    renderLoginPage();

    enterEmail('trader@example.com');
    fireEvent.change(screen.getByPlaceholderText('enter your password'), {
      target: { value: 'incorrect-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    expect(screen.queryByText(authError)).not.toBeInTheDocument();
  });

  it.each([
    ['known email', { error: null }],
    ['unknown email', { error: { code: 'user_not_found', message: 'User not found' } }],
  ])('shows the same reset confirmation for a %s', async (_case, response) => {
    auth.resetPasswordForEmail.mockResolvedValue(response);
    renderLoginPage();

    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    enterEmail('trader@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(
      await screen.findByText(
        "If an account exists for this email, you'll receive a reset link shortly.",
      ),
    ).toBeInTheDocument();
  });

  it.each([
    ['new email', [{ id: 'email', identity_data: { email: 'trader@example.com' } }]],
    ['duplicate email', []],
  ])('shows the same signup confirmation for a %s', async (_case, identities) => {
    auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'trader@example.com',
          identities,
        },
      },
      error: null,
    });
    renderLoginPage();

    fireEvent.click(screen.getByRole('button', { name: 'Create an account' }));
    enterEmail('trader@example.com');
    fireEvent.change(screen.getByPlaceholderText('enter your password'), {
      target: { value: 'a-long-enough-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByText(
        "If an account can be created for this email, we'll send the next step shortly.",
      ),
    ).toBeInTheDocument();
  });
});
