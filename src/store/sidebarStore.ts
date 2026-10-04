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
const COMPACT_WIDTH = 72;
const COMPACT_THRESHOLD = 128;
const MIN_EXPANDED_WIDTH = 180;
const MAX_EXPANDED_WIDTH = 360;

function getInitialCollapsed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(STORAGE_COLLAPSED_KEY) === 'true';
}

function getInitialWidth(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_EXPANDED_WIDTH;
  if (getInitialCollapsed()) return COMPACT_WIDTH;
  const raw = localStorage.getItem(STORAGE_WIDTH_KEY);
  const n = raw ? parseInt(raw, 10) : DEFAULT_EXPANDED_WIDTH;
  if (isNaN(n)) return DEFAULT_EXPANDED_WIDTH;
  return n < COMPACT_THRESHOLD ? COMPACT_WIDTH : Math.max(MIN_EXPANDED_WIDTH, Math.min(MAX_EXPANDED_WIDTH, n));
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: getInitialCollapsed(),
  width: getInitialWidth(),

  toggleCollapse: () =>
    set((state) => {
      const next = !state.collapsed;
      const width = next ? COMPACT_WIDTH : DEFAULT_EXPANDED_WIDTH;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_COLLAPSED_KEY, String(next));
        localStorage.setItem(STORAGE_WIDTH_KEY, String(width));
      }
      return { collapsed: next, width };
    }),

  setCollapsed: (collapsed) => {
    const width = collapsed ? COMPACT_WIDTH : DEFAULT_EXPANDED_WIDTH;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_COLLAPSED_KEY, String(collapsed));
      localStorage.setItem(STORAGE_WIDTH_KEY, String(width));
    }
    set({ collapsed, width });
  },

  setWidth: (width) => {
    const clamped = width < COMPACT_THRESHOLD
      ? COMPACT_WIDTH
      : Math.max(MIN_EXPANDED_WIDTH, Math.min(MAX_EXPANDED_WIDTH, width));
    const collapsed = clamped === COMPACT_WIDTH;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_COLLAPSED_KEY, String(collapsed));
      localStorage.setItem(STORAGE_WIDTH_KEY, String(clamped));
    }
    set({ width: clamped, collapsed });
  },
}));
