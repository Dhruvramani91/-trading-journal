import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
  type TooltipPayloadEntry,
} from 'recharts';
import type { DashboardMetric } from '@/analytics/core';
import type { ChartPalette } from '@/lib/chartTheme';
import { formatMoneyCompact, formatR, formatSignedMoney } from '@/lib/format';

interface DashboardEquityChartProps {
  data: Array<{ dateLabel: string; cumulative: number }>;
  metric: DashboardMetric;
  chart: ChartPalette;
}

export default function DashboardEquityChart({ data, metric, chart }: DashboardEquityChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 16, left: metric === 'r' ? -20 : 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 5" stroke={chart.grid} vertical={false} />
        <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: chart.axisText }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: chart.axisText }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => (metric === 'r' ? `${value}R` : formatMoneyCompact(value))}
          width={metric === 'r' ? 45 : 64}
        />
        <ReTooltip
          contentStyle={{
            background: chart.tooltipBg,
            border: `1px solid ${chart.tooltipBorder}`,
            borderRadius: '0.75rem',
            boxShadow: chart.tooltipShadow,
            color: chart.tooltipText,
            fontSize: '0.75rem',
          }}
          formatter={(value: unknown, _name: unknown, item: TooltipPayloadEntry) => {
            const point = item.payload as { dateLabel: string } | undefined;
            const numericValue = typeof value === 'number' ? value : 0;
            const name = metric === 'r' ? 'Cumulative' : 'Cumulative P&L';
            const formatted = metric === 'r' ? formatR(numericValue) : formatSignedMoney(numericValue);
            return [point ? `${formatted} (${point.dateLabel})` : formatted, name];
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke={chart.accent}
          strokeWidth={2}
          fill={chart.accent}
          fillOpacity={0.07}
          dot={false}
          activeDot={{ r: 4, fill: chart.accent, stroke: chart.tooltipBg, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
