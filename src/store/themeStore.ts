import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const STORAGE_KEY = 'pj:theme';
const LANDING_STORAGE_KEY = 'theme';

function getInitialTheme(): Theme {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LANDING_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    }
  } catch {
    // Fall back to the operating system preference if storage is unavailable.
  }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}

function persistTheme(theme: Theme) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
    localStorage.setItem(LANDING_STORAGE_KEY, theme);
  } catch {
    // Keep the in-memory theme even when browser storage is unavailable.
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),

  toggle: () =>
    set((state) => {
      const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
      persistTheme(next);
      applyTheme(next);
      return { theme: next };
    }),

  setTheme: (t) => {
    persistTheme(t);
    applyTheme(t);
    set({ theme: t });
  },
}));

export function initTheme() {
  applyTheme(getInitialTheme());
}
