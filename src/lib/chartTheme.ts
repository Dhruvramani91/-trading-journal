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

export function useChartTheme(): ChartPalette {
  const style = getComputedStyle(document.documentElement);
  const color = (token: string) => `rgb(${style.getPropertyValue(token).trim()})`;
  return {
    grid: color('--line-subtle'),
    axisText: color('--fg-muted'),
    axisMuted: color('--fg-dim'),
    tooltipBg: color('--bg-2'),
    tooltipBorder: color('--line'),
    tooltipShadow: 'none',
    tooltipText: color('--fg'),
    accent: color('--accent'),
    win: color('--win'),
    loss: color('--loss'),
    be: color('--be'),
    tickLine: color('--line'),
    referenceLine: color('--line-strong'),
  };
}
