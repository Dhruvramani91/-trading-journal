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
  isPrivate?: boolean;
}

export default function DashboardEquityChart({ data, metric, isPrivate }: DashboardEquityChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 16, left: metric === 'r' ? -20 : 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="currentColor" strokeOpacity={0.08} vertical={false} />
        <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#8c94a0' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: '#8c94a0' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value: number) => {
            if (isPrivate) return '***';
            return metric === 'r' ? `${value}R` : formatMoneyCompact(value);
          }}
          width={metric === 'r' ? 45 : 64}
        />
        <ReTooltip
          contentStyle={{
            background: 'var(--bg-2, #18181b)',
            border: '1px solid var(--line, #27272a)',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            color: 'var(--fg, #f4f4f5)',
            fontSize: '0.75rem',
          }}
          formatter={(value: unknown, _name: unknown, item: TooltipPayloadEntry) => {
            const point = item.payload as { dateLabel: string } | undefined;
            const numericValue = typeof value === 'number' ? value : 0;
            const name = metric === 'r' ? 'Cumulative' : 'Cumulative P&L';
            if (isPrivate) return ['***', name];
            const formatted = metric === 'r' ? formatR(numericValue) : formatSignedMoney(numericValue);
            return [point ? `${formatted} (${point.dateLabel})` : formatted, name];
          }}
        />
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="#38bdf8"
          strokeWidth={2.5}
          fill="url(#equityGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#38bdf8', stroke: '#090a0c', strokeWidth: 2 }}
          isAnimationActive={true}
          animationDuration={900}
          animationEasing="ease-out"
          animationBegin={150}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
