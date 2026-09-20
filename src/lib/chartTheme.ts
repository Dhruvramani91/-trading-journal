import { useThemeStore } from '@/store/themeStore';

export interface ChartPalette {
  grid: string;
  axisText: string;
  axisMuted: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipShadow: string;
  tooltipText: string;
  accent: string;
  win: string;
  loss: string;
  be: string;
  tickLine: string;
  referenceLine: string;
}

const LIGHT: ChartPalette = {
  grid: '#eef0f1',
  axisText: '#a2a4a7',
  axisMuted: '#64748b',
  tooltipBg: '#ffffff',
  tooltipBorder: '#eef0f1',
  tooltipShadow: '0 4px 16px rgba(0,0,0,0.10)',
  tooltipText: '#101014',
  accent: '#3b82f6',
  win: '#39bd9a',
  loss: '#d95d65',
  be: '#a2a4a7',
  tickLine: '#e0e2e6',
  referenceLine: 'rgba(16,16,20,0.25)',
};

const DARK: ChartPalette = {
  grid: '#2e3340',
  axisText: '#8a93a6',
  axisMuted: '#9aa6b8',
  tooltipBg: '#1b1f2a',
  tooltipBorder: '#343a47',
  tooltipShadow: '0 4px 20px rgba(0,0,0,0.6)',
  tooltipText: '#e8eaee',
  accent: '#60a5fa',
  win: '#48cda7',
  loss: '#f0646c',
  be: '#6e7684',
  tickLine: '#454b58',
  referenceLine: 'rgba(232,234,238,0.3)',
};

export function useChartTheme(): ChartPalette {
  const { theme } = useThemeStore();
  return theme === 'dark' ? DARK : LIGHT;
}