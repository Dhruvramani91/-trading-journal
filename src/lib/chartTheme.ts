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
  grid: '#e6ebf2',
  axisText: '#7e8fa5',
  axisMuted: '#5b6c82',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e0e4eb',
  tooltipShadow: '0 8px 24px rgba(20,32,52,0.12)',
  tooltipText: '#191f2b',
  accent: '#2d67d3',
  win: '#138b65',
  loss: '#c34653',
  be: '#808a99',
  tickLine: '#ccd7e5',
  referenceLine: 'rgba(25,31,43,0.22)',
};

const DARK: ChartPalette = {
  grid: '#253448',
  axisText: '#7489a0',
  axisMuted: '#9fb0c4',
  tooltipBg: '#141e2b',
  tooltipBorder: '#35495f',
  tooltipShadow: '0 8px 24px rgba(0,0,0,0.52)',
  tooltipText: '#ecf2f9',
  accent: '#69a5ff',
  win: '#51d39e',
  loss: '#ff7e8b',
  be: '#9db1c7',
  tickLine: '#37495f',
  referenceLine: 'rgba(236,242,249,0.26)',
};

export function useChartTheme(): ChartPalette {
  const { theme } = useThemeStore();
  return theme === 'dark' ? DARK : LIGHT;
}
