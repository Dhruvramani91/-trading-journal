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
  grid: '#e9edf3',
  axisText: '#858f9e',
  axisMuted: '#5f6a7b',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e0e4eb',
  tooltipShadow: '0 8px 24px rgba(20,32,52,0.12)',
  tooltipText: '#191f2b',
  accent: '#395bbe',
  win: '#188560',
  loss: '#c04656',
  be: '#808a99',
  tickLine: '#ccd3de',
  referenceLine: 'rgba(25,31,43,0.22)',
};

const DARK: ChartPalette = {
  grid: '#29292b',
  axisText: '#7b7b78',
  axisMuted: '#a6a6a3',
  tooltipBg: '#171718',
  tooltipBorder: '#29292b',
  tooltipShadow: '0 8px 24px rgba(0,0,0,0.52)',
  tooltipText: '#f3f3f1',
  accent: '#dcdcd8',
  win: '#4ecd9d',
  loss: '#f47b89',
  be: '#999995',
  tickLine: '#3c3c3f',
  referenceLine: 'rgba(243,243,241,0.26)',
};

export function useChartTheme(): ChartPalette {
  const { theme } = useThemeStore();
  return theme === 'dark' ? DARK : LIGHT;
}
