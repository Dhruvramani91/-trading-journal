import { create } from 'zustand';

interface SidebarState {
  collapsed: boolean;
  width: number;
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setWidth: (width: number) => void;
}

const STORAGE_COLLAPSED_KEY = 'tj:sidebar:collapsed';
const STORAGE_WIDTH_KEY = 'tj:sidebar:width';

function getInitialCollapsed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(STORAGE_COLLAPSED_KEY) === 'true';
}

function getInitialWidth(): number {
  if (typeof localStorage === 'undefined') return 240;
  const raw = localStorage.getItem(STORAGE_WIDTH_KEY);
  const n = raw ? parseInt(raw, 10) : 240;
  return isNaN(n) ? 240 : Math.max(180, Math.min(360, n));
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: getInitialCollapsed(),
  width: getInitialWidth(),

  toggleCollapse: () =>
    set((state) => {
      const next = !state.collapsed;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_COLLAPSED_KEY, String(next));
      }
      return { collapsed: next };
    }),

  setCollapsed: (collapsed) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_COLLAPSED_KEY, String(collapsed));
    }
    set({ collapsed });
  },

  setWidth: (width) => {
    const clamped = Math.max(180, Math.min(360, width));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_WIDTH_KEY, String(clamped));
    }
    set({ width: clamped });
  },
}));
