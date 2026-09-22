import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  isGuest?: boolean;
}

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  otpSent: boolean;
  initialized: boolean;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  resetOtp: () => void;
  init: () => Promise<void>;
}

const STORAGE_USER_KEY = 'tj:auth:user';

function getStoredUser(): UserProfile | null {
  if (typeof localStorage === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user: UserProfile | null): void {
  if (typeof localStorage === 'undefined') return;

  if (user) {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_USER_KEY);
  }
}

function profileFromSupabaseUser(u: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): UserProfile {
  return {
    id: u.id,
    email: u.email || '',
    name:
      (u.user_metadata?.full_name as string) ||
      (u.user_metadata?.name as string) ||
      u.email?.split('@')[0] ||
      'Trader',
    avatarUrl: u.user_metadata?.avatar_url as string | undefined,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  loading: false,
  error: null,
  otpSent: false,
  initialized: false,

  clearError: () => set({ error: null }),

  resetOtp: () => set({
    otpSent: false,
    error: null,
  }),

  init: async () => {
    if (get().initialized) return;

    if (isSupabaseConfigured && supabase) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const profile = profileFromSupabaseUser(session.user);

          set({
            user: profile,
            initialized: true,
          });

          setStoredUser(profile);
        } else {
          set({
            user: getStoredUser(),
            initialized: true,
          });
        }

        supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            const profile = profileFromSupabaseUser(session.user);

            set({
              user: profile,
            });

            setStoredUser(profile);
          } else {
            set({
              user: null,
            });

            setStoredUser(null);
          }
        });
      } catch (err) {
        console.warn(
          'Supabase auth init failed, fallback to local',
          err
        );

        set({
          user: getStoredUser(),
          initialized: true,
        });
      }
    } else {
      set({
        user: getStoredUser(),
        initialized: true,
      });
    }
  },

  sendOtp: async (email: string) => {
    set({
      loading: true,
      error: null,
    });

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: {
            shouldCreateUser: true,
          },
        });

        if (error) throw error;

        set({
          otpSent: true,
          loading: false,
        });
      } else {
        // Local-first fallback: auto-sign in
        const profile: UserProfile = {
          id:
            'user_' +
            email
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')
              .slice(0, 10),
          email: email.trim().toLowerCase(),
          name: email.split('@')[0],
        };

        set({
          user: profile,
          otpSent: false,
          loading: false,
        });

        setStoredUser(profile);
      }
    } catch (err) {
      set({
        error: (err as Error).message || 'Failed to send code',
        loading: false,
      });

      throw err;
    }
  },

  verifyOtp: async (email: string, token: string) => {
    set({
      loading: true,
      error: null,
    });

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: token.trim(),
          type: 'email',
        });

        if (error) throw error;

        if (data.user) {
          const profile = profileFromSupabaseUser(data.user);

          set({
            user: profile,
            loading: false,
            otpSent: false,
          });

          setStoredUser(profile);
        }
      } else {
        throw new Error(
          'Supabase is not configured. Enable it to use OTP verification.'
        );
      }
    } catch (err) {
      set({
        error: (err as Error).message || 'Invalid or expired code',
        loading: false,
      });

      throw err;
    }
  },

  signUp: async (email: string, password: string) => {
    set({
      loading: true,
      error: null,
    });

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirmed`,
          },
        });

        if (error) throw error;

        // Supabase's signUp() does NOT return an error when the email is
        // already registered and confirmed — it's an anti-enumeration
        // measure. Instead it returns a user object with an empty
        // `identities` array. That's the only reliable signal we get, so
        // we turn it into a real error the UI can show.
        if (
          data.user &&
          data.user.identities &&
          data.user.identities.length === 0
        ) {
          throw new Error(
            'An account with this email already exists. Please log in instead.'
          );
        }

        set({
          loading: false,
        });
      } else {
        // Local-first fallback: auto-sign in
        const profile: UserProfile = {
          id:
            'user_' +
            email
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')
              .slice(0, 10),
          email: email.trim().toLowerCase(),
          name: email.split('@')[0],
        };

        set({
          user: profile,
          loading: false,
        });

        setStoredUser(profile);
      }
    } catch (err) {
      set({
        error: (err as Error).message || 'Sign-up failed',
        loading: false,
      });

      throw err;
    }
  },

  signInWithPassword: async (
    email: string,
    password: string
  ) => {
    set({
      loading: true,
      error: null,
    });

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });

        if (error) throw error;

        if (data.user) {
          const profile = profileFromSupabaseUser(data.user);

          set({
            user: profile,
            loading: false,
          });

          setStoredUser(profile);
        }
      } else {
        throw new Error('Supabase is not configured.');
      }
    } catch (err) {
      set({
        error:
          (err as Error).message ||
          'Invalid email or password',
        loading: false,
      });

      throw err;
    }
  },

  signInWithGoogle: async () => {
    set({
      loading: true,
      error: null,
    });

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } =
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo:
                `${window.location.origin}/auth/callback`,
            },
          });

        if (error) throw error;

        // Browser redirects, loading stays true
      } else {
        // Local-first fallback: demo Google user
        const profile: UserProfile = {
          id: 'google_demo_user',
          email: 'trader@gmail.com',
          name: 'Google Trader',
          avatarUrl: undefined,
        };

        set({
          user: profile,
          loading: false,
        });

        setStoredUser(profile);
      }
    } catch (err) {
      set({
        error:
          (err as Error).message ||
          'Google sign-in failed',
        loading: false,
      });

      throw err;
    }
  },

  signInAsGuest: async () => {
    const guestUser: UserProfile = {
      id: 'guest_user',
      email: 'guest@journey.app',
      name: 'Guest Trader',
      isGuest: true,
    };

    set({
      user: guestUser,
    });

    setStoredUser(guestUser);
  },

  signOut: async () => {
    set({
      loading: true,
    });

    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }

    set({
      user: null,
      loading: false,
      otpSent: false,
    });

    setStoredUser(null);
  },
}));