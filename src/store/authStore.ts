import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  isGuest?: boolean;
}

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  signInWithPassword: (email: string, pass: string) => Promise<void>;
  signUpWithPassword: (email: string, pass: string, name?: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  init: () => Promise<void>;
}

const STORAGE_USER_KEY = 'tj:auth:user';

function getStoredUser(): UserProfile | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getStoredUser(),
  loading: false,
  error: null,
  initialized: false,

  clearError: () => set({ error: null }),

  init: async () => {
    if (get().initialized) return;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile: UserProfile = {
            id: session.user.id,
            email: session.user.email || 'trader@example.com',
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          };
          set({ user: profile, initialized: true });
          setStoredUser(profile);
        } else {
          set({ user: getStoredUser(), initialized: true });
        }

        supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            const profile: UserProfile = {
              id: session.user.id,
              email: session.user.email || 'trader@example.com',
              name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            };
            set({ user: profile });
            setStoredUser(profile);
          } else {
            set({ user: null });
            setStoredUser(null);
          }
        });
      } catch (err) {
        console.warn('Supabase auth init failed, fallback to local', err);
        set({ user: getStoredUser(), initialized: true });
      }
    } else {
      set({ user: getStoredUser(), initialized: true });
    }
  },

  signInWithPassword: async (email: string, pass: string) => {
    set({ loading: true, error: null });
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) throw error;
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.full_name || email.split('@')[0],
          };
          set({ user: profile, loading: false });
          setStoredUser(profile);
        }
      } else {
        // Local-first instant authentication
        if (!email || !pass) throw new Error('Please enter an email and password.');
        const profile: UserProfile = {
          id: 'user_' + btoa(email.toLowerCase()).slice(0, 12),
          email: email.trim().toLowerCase(),
          name: email.split('@')[0],
        };
        set({ user: profile, loading: false });
        setStoredUser(profile);
      }
    } catch (err) {
      set({ error: (err as Error).message || 'Failed to sign in', loading: false });
      throw err;
    }
  },

  signUpWithPassword: async (email: string, pass: string, name?: string) => {
    set({ loading: true, error: null });
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: { full_name: name || email.split('@')[0] },
          },
        });
        if (error) throw error;
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            name: name || email.split('@')[0],
          };
          set({ user: profile, loading: false });
          setStoredUser(profile);
        }
      } else {
        // Local-first instant account registration
        if (!email || !pass) throw new Error('Please enter an email and password.');
        if (pass.length < 6) throw new Error('Password must be at least 6 characters.');
        const profile: UserProfile = {
          id: 'user_' + btoa(email.toLowerCase()).slice(0, 12),
          email: email.trim().toLowerCase(),
          name: name?.trim() || email.split('@')[0],
        };
        set({ user: profile, loading: false });
        setStoredUser(profile);
      }
    } catch (err) {
      set({ error: (err as Error).message || 'Failed to create account', loading: false });
      throw err;
    }
  },

  signInAsGuest: async () => {
    set({ loading: true, error: null });
    const guestUser: UserProfile = {
      id: 'guest_user',
      email: 'guest@tradingjournal.app',
      name: 'Guest Trader',
      isGuest: true,
    };
    set({ user: guestUser, loading: false });
    setStoredUser(guestUser);
  },

  signOut: async () => {
    set({ loading: true });
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    set({ user: null, loading: false });
    setStoredUser(null);
  },
}));
