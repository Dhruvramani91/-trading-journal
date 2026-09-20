import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const STORAGE_KEY = 'pj:theme';

function getInitialTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'light';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),

  toggle: () =>
    set((state) => {
      const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, next);
      }
      applyTheme(next);
      return { theme: next };
    }),

  setTheme: (t) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, t);
    }
    applyTheme(t);
    set({ theme: t });
  },
}));

export function initTheme() {
  applyTheme(getInitialTheme());
}