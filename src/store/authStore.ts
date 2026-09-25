import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  reloadTradesForCurrentUser,
  clearTradesForCurrentUser,
} from '@/store/tradesStore';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
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

  checkEmailExists: (email: string) => Promise<boolean>;

  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<void>;

  signInWithGoogle: () => Promise<void>;

  signInAsGuest: () => Promise<void>;

  sendPasswordReset: (email: string) => Promise<void>;

  updatePassword: (password: string) => Promise<void>;

  signOut: () => Promise<void>;

  clearError: () => void;

  resetOtp: () => void;

  init: () => Promise<() => void>;
}

/* -------------------------------------------------- */
/* LOCAL STORAGE                                      */
/* -------------------------------------------------- */

const STORAGE_KEY = 'precisionjournal:user';

function getStoredUser(): UserProfile | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return null;
    }

    return JSON.parse(stored) as UserProfile;
  } catch {
    return null;
  }
}

function setStoredUser(user: UserProfile | null) {
  try {
    if (user) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(user)
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore localStorage errors.
  }
}

/* -------------------------------------------------- */
/* SUPABASE USER → APP PROFILE                        */
/* -------------------------------------------------- */

function profileFromSupabaseUser(
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  }
): UserProfile {
  const metadata = user.user_metadata || {};

  const name =
    typeof metadata.name === 'string'
      ? metadata.name
      : typeof metadata.full_name === 'string'
        ? metadata.full_name
        : user.email?.split('@')[0] || 'Trader';

  const avatar =
    typeof metadata.avatar_url === 'string'
      ? metadata.avatar_url
      : undefined;

  return {
    id: user.id,
    email: user.email || '',
    name,
    avatar,
    isGuest: false,
  };
}

/* -------------------------------------------------- */
/* STORE                                              */
/* -------------------------------------------------- */

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),
  loading: false,
  error: null,
  otpSent: false,
  initialized: false,

  /* ------------------------------------------------ */
  /* OTP — KEPT FOR COMPATIBILITY                     */
  /* ------------------------------------------------ */

  sendOtp: async (email: string) => {
    set({
      loading: true,
      error: null,
    });

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured.');
      }

      const { error } =
        await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
        });

      if (error) {
        throw error;
      }

      set({
        otpSent: true,
        loading: false,
      });
    } catch (err) {
      set({
        error:
          (err as Error).message ||
          'Failed to send verification code.',
        loading: false,
      });

      throw err;
    }
  },

  verifyOtp: async (
    email: string,
    token: string
  ) => {
    set({
      loading: true,
      error: null,
    });

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured.');
      }

      const { data, error } =
        await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token,
          type: 'email',
        });

      if (error) {
        throw error;
      }

      if (data.user) {
        const profile = profileFromSupabaseUser(
          data.user
        );

        set({
          user: profile,
          loading: false,
          otpSent: false,
        });

        setStoredUser(profile);

        /*
         * Supabase auth state will also trigger reload,
         * but loading here makes OTP login responsive
         * even before the auth event finishes.
         */
        void reloadTradesForCurrentUser();
      } else {
        set({
          loading: false,
          otpSent: false,
        });
      }
    } catch (err) {
      set({
        error:
          (err as Error).message ||
          'Invalid verification code.',
        loading: false,
      });

      throw err;
    }
  },

  /* ------------------------------------------------ */
  /* SIGN UP                                          */
  /* ------------------------------------------------ */

  signUp: async (
    email: string,
    password: string
  ) => {
    set({
      loading: true,
      error: null,
    });

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured.');
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      const { data, error } =
        await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo:
              `${window.location.origin}/auth/confirmed`,
          },
        });

      if (error) {
        throw error;
      }

      /*
       * Supabase can return a user with an empty
       * identities array when the email already exists.
       */
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
    } catch (err) {
      set({
        error:
          (err as Error).message ||
          'Sign-up failed.',
        loading: false,
      });

      throw err;
    }
  },

  /* ------------------------------------------------ */
  /* CHECK EMAIL EXISTS                               */
  /* ------------------------------------------------ */

  checkEmailExists: async (
    email: string
  ) => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error(
        'Supabase is not configured.'
      );
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const { data, error } =
      await supabase.functions.invoke(
        'check-email-exists',
        {
          body: {
            email: normalizedEmail,
          },
        }
      );

    if (error) {
      throw error;
    }

    return Boolean(data?.exists);
  },

  /* ------------------------------------------------ */
  /* LOGIN WITH PASSWORD                              */
  /* ------------------------------------------------ */

  signInWithPassword: async (
    email: string,
    password: string
  ) => {
    set({
      loading: true,
      error: null,
    });

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured.');
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      /*
       * First check whether the email exists.
       */
      const { data: emailCheck, error: checkError } =
        await supabase.functions.invoke(
          'check-email-exists',
          {
            body: {
              email: normalizedEmail,
            },
          }
        );

      if (checkError) {
        throw checkError;
      }

      if (!emailCheck?.exists) {
        throw new Error(
          'Email does not exist. Please sign up first.'
        );
      }

      /*
       * Email exists, so now check the password.
       */
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (error) {
        throw error;
      }

      if (data.user) {
        const profile = profileFromSupabaseUser(
          data.user
        );

        set({
          user: profile,
          loading: false,
        });

        setStoredUser(profile);

        /*
         * Immediately replace the previous user's
         * in-memory trades with the new user's trades.
         */
        void reloadTradesForCurrentUser();
      } else {
        set({
          loading: false,
        });
      }
    } catch (err) {
      set({
        error:
          (err as Error).message ||
          'Invalid email or password.',
        loading: false,
      });

      throw err;
    }
  },

  /* ------------------------------------------------ */
  /* GOOGLE LOGIN                                     */
  /* ------------------------------------------------ */

  signInWithGoogle: async () => {
    set({
      loading: true,
      error: null,
    });

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured.');
      }

      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo:
              `${window.location.origin}/auth/callback`,
          },
        });

      if (error) {
        throw error;
      }

      set({
        loading: false,
      });
    } catch (err) {
      set({
        error:
          (err as Error).message ||
          'Google sign-in failed.',
        loading: false,
      });

      throw err;
    }
  },

  /* ------------------------------------------------ */
  /* GUEST LOGIN                                      */
  /* ------------------------------------------------ */

  signInAsGuest: async () => {
    /*
     * Guest mode doesn't use Supabase trades.
     * Clear any previously authenticated user's
     * trades before entering guest mode.
     */
    clearTradesForCurrentUser();

    const guestUser: UserProfile = {
      id: 'guest',
      email: 'guest@precisionjournal.local',
      name: 'Guest Trader',
      isGuest: true,
    };

    set({
      user: guestUser,
      loading: false,
      error: null,
    });

    setStoredUser(guestUser);
  },

  /* ------------------------------------------------ */
  /* PASSWORD RESET — EMAIL LINK ONLY                 */
  /* ------------------------------------------------ */

  sendPasswordReset: async (
    email: string
  ) => {
    set({
      loading: true,
      error: null,
    });

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured.');
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      /*
       * Check whether the email exists before
       * sending the reset email.
       */
      const { data: emailCheck, error: checkError } =
        await supabase.functions.invoke(
          'check-email-exists',
          {
            body: {
              email: normalizedEmail,
            },
          }
        );

      if (checkError) {
        throw checkError;
      }

      if (!emailCheck?.exists) {
        throw new Error(
          'Email does not exist. Please sign up first.'
        );
      }

      /*
       * Existing account → send normal Supabase
       * password reset email.
       */
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo:
              `${window.location.origin}/auth/reset-password`,
          }
        );

      if (error) {
        throw error;
      }

      set({
        loading: false,
      });
    } catch (err) {
      set({
        error:
          (err as Error).message ||
          'Failed to send password reset email.',
        loading: false,
      });

      throw err;
    }
  },

  /* ------------------------------------------------ */
  /* UPDATE PASSWORD                                  */
  /* ------------------------------------------------ */

  updatePassword: async (
    password: string
  ) => {
    set({
      loading: true,
      error: null,
    });

    try {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase is not configured.');
      }

      const { data, error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        throw error;
      }

      if (data.user) {
        const profile = profileFromSupabaseUser(
          data.user
        );

        set({
          user: profile,
          loading: false,
        });

        setStoredUser(profile);
      } else {
        set({
          loading: false,
        });
      }
    } catch (err) {
      set({
        error:
          (err as Error).message ||
          'Failed to update password.',
        loading: false,
      });

      throw err;
    }
  },

  /* ------------------------------------------------ */
  /* SIGN OUT                                         */
  /* ------------------------------------------------ */

  signOut: async () => {
    /*
     * IMPORTANT:
     * Clear the current user's trades BEFORE
     * the sign-out request completes.
     *
     * This prevents User A's trades from remaining
     * visible while User B is logging in.
     */
    clearTradesForCurrentUser();

    set({
      loading: true,
      error: null,
    });

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } =
          await supabase.auth.signOut();

        if (error) {
          throw error;
        }
      }

      localStorage.removeItem(STORAGE_KEY);

      set({
        user: null,
        loading: false,
        otpSent: false,
        error: null,
      });
    } catch (err) {
      set({
        loading: false,
        error:
          (err as Error).message ||
          'Failed to sign out.',
      });

      throw err;
    }
  },

  /* ------------------------------------------------ */
  /* CLEAR ERROR                                      */
  /* ------------------------------------------------ */

  clearError: () => {
    set({
      error: null,
    });
  },

  /* ------------------------------------------------ */
  /* RESET OTP                                        */
  /* ------------------------------------------------ */

  resetOtp: () => {
    set({
      otpSent: false,
      error: null,
    });
  },

  /* ------------------------------------------------ */
  /* INITIALIZE AUTH                                  */
  /* ------------------------------------------------ */

  init: async () => {
    if (!isSupabaseConfigured || !supabase) {
      clearTradesForCurrentUser();

      set({
        user: null,
        initialized: true,
      });

      return () => {};
    }

    try {
      /*
       * Get the current Supabase session first.
       */
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (session?.user) {
        const profile = profileFromSupabaseUser(
          session.user
        );

        set({
          user: profile,
          initialized: true,
        });

        setStoredUser(profile);

        /*
         * Load the current user's trades.
         */
        await reloadTradesForCurrentUser();
      } else {
        /*
         * No authenticated user means there must
         * be no authenticated user's trades in memory.
         */
        clearTradesForCurrentUser();

        set({
          user: null,
          initialized: true,
        });

        setStoredUser(null);
      }

      /*
       * Listen for future authentication changes.
       */
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!session?.user) {
            /*
             * User logged out.
             * Immediately remove the previous user's
             * trades from the in-memory store.
             */
            clearTradesForCurrentUser();

            set({
              user: null,
            });

            setStoredUser(null);

            return;
          }

          const profile =
            profileFromSupabaseUser(
              session.user
            );

          set({
            user: profile,
          });

          setStoredUser(profile);

          /*
           * The Supabase auth callback should not
           * perform another Supabase request directly.
           *
           * Defer the trade reload until after the
           * auth callback has completed.
           */
          setTimeout(() => {
            void reloadTradesForCurrentUser();
          }, 0);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    } catch (err) {
      /*
       * If authentication initialization fails,
       * don't leave another user's trades in memory.
       */
      clearTradesForCurrentUser();

      set({
        user: null,
        initialized: true,
        error:
          (err as Error).message ||
          'Failed to initialize authentication.',
      });

      setStoredUser(null);

      return () => {};
    }
  },
}));