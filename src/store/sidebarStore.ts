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

const DEFAULT_EXPANDED_WIDTH = 240;
const MIN_EXPANDED_WIDTH = 180;
const MAX_EXPANDED_WIDTH = 360;

function getInitialCollapsed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(STORAGE_COLLAPSED_KEY) === 'true';
}

function getInitialWidth(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_EXPANDED_WIDTH;
  const raw = localStorage.getItem(STORAGE_WIDTH_KEY);
  const n = raw ? parseInt(raw, 10) : DEFAULT_EXPANDED_WIDTH;
  return isNaN(n) ? DEFAULT_EXPANDED_WIDTH : Math.max(MIN_EXPANDED_WIDTH, Math.min(MAX_EXPANDED_WIDTH, n));
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
    const clamped = Math.max(MIN_EXPANDED_WIDTH, Math.min(MAX_EXPANDED_WIDTH, width));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_WIDTH_KEY, String(clamped));
    }
    set({ width: clamped });
  },
}));
