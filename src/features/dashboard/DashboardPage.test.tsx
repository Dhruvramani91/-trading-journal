import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Trade } from '@/domain/models/trade';
import { DashboardPage } from './DashboardPage';

const h = vi.hoisted(() => ({
  useTradesStore: vi.fn(),
  bootTradesStore: vi.fn(),
  useFilteredTrades: vi.fn(),
  useAuthStore: vi.fn(),
  useFilterStore: vi.fn(),
}));

vi.mock('@/store/tradesStore', () => ({
  useTradesStore: h.useTradesStore,
  bootTradesStore: h.bootTradesStore,
}));

vi.mock('@/store/filterStore', () => ({
  useFilteredTrades: h.useFilteredTrades,
  useFilterStore: h.useFilterStore,
}));

vi.mock('@/store/authStore', () => ({ useAuthStore: h.useAuthStore }));

vi.mock('@/lib/chartTheme', () => ({
  useChartTheme: () => ({
    grid: '#eee', axisText: '#aaa', axisMuted: '#999', tickLine: '#ddd',
    referenceLine: '#000', accent: '#3b82f6', win: '#0a0', loss: '#a00', be: '#888',
    tooltipBg: '#fff', tooltipBorder: '#eee', tooltipShadow: '', tooltipText: '#000',
  }),
}));

// Charts are irrelevant here; stub recharts so jsdom needs no ResizeObserver.
vi.mock('recharts', () => ({
  ResponsiveContainer: () => null,
  LineChart: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

function makeTrade(
  o: Partial<Trade> & { openedAt: string; r: number; result: Trade['result'] },
): Trade {
  return {
    id: o.id ?? Math.random().toString(36).slice(2),
    templateId: 'default-ict-2026',
    number: o.number,
    openedAt: o.openedAt,
    instrument: o.instrument ?? 'ES',
    direction: o.direction ?? 'long',
    result: o.result,
    pnl: o.pnl,
    r: o.r,
    durationMin: o.durationMin ?? 30,
    templateData: o.templateData ?? {},
    createdAt: o.openedAt,
    updatedAt: o.openedAt,
  };
}

// Best setup differs by metric: t1 is best by R, t2 is best by P&L.
const TRADES: Trade[] = [
  makeTrade({ id: 't1', number: 1, openedAt: '2026-01-01T10:00:00Z', instrument: 'NQ', r: 5, pnl: 100, result: 'win', templateData: { dailyCandle: 'Reversal [C2]' } }),
  makeTrade({ id: 't2', number: 2, openedAt: '2026-01-02T10:00:00Z', instrument: 'ES', r: 1, pnl: 900, result: 'win', templateData: { dailyCandle: 'Continuation [C3]' } }),
  makeTrade({ id: 't3', number: 3, openedAt: '2026-01-03T10:00:00Z', instrument: 'SI', r: -2, pnl: -300, result: 'loss', direction: 'short', templateData: { dailyCandle: 'Continuation [C3]' } }),
  // No P&L recorded — must never render NaN/$undefined.
  makeTrade({ id: 't4', number: 4, openedAt: '2026-01-04T10:00:00Z', instrument: 'CL', r: 0, result: 'be', templateData: { dailyCandle: 'Reversal [C2]' } }),
];

const FILTERS = {
  core: { from: '', to: '', instrument: '', direction: 'all', result: 'all' },
  categorical: {},
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage — P&L support', () => {
  beforeEach(() => {
    h.useTradesStore.mockImplementation((selector?: (s: { trades: Trade[] }) => unknown) =>
      selector ? selector({ trades: TRADES }) : { loaded: true, load: vi.fn(), trades: TRADES },
    );
    h.bootTradesStore.mockImplementation(() => undefined);
    h.useFilteredTrades.mockImplementation(() => ({ filtered: TRADES, filters: FILTERS, activeCount: 0 }));
    h.useAuthStore.mockImplementation(() => ({ user: { id: 'u1', name: 'Test User', email: 't@t.com' } }));
    h.useFilterStore.mockImplementation(() => ({
      filters: FILTERS,
      setFilter: vi.fn(),
      setCoreFilter: vi.fn(),
      resetFilters: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the R section and adds a P&L section', async () => {
    renderDashboard();
    await screen.findByText('Performance — R');

    expect(screen.getByText('Performance — P&L')).toBeInTheDocument();
    expect(screen.getByText('Total R')).toBeInTheDocument();
    expect(screen.getByText('Total P&L')).toBeInTheDocument();
    expect(screen.getByText('+4.00R')).toBeInTheDocument(); // R total unchanged
  });

  it('shows average realized R independently of planned R:R values', async () => {
    const trades = [
      makeTrade({ openedAt: '2026-01-01T10:00:00Z', r: 5, result: 'win' }),
      makeTrade({ openedAt: '2026-01-02T10:00:00Z', r: 1, result: 'win' }),
      makeTrade({ openedAt: '2026-01-03T10:00:00Z', r: -2, result: 'loss' }),
      makeTrade({ openedAt: '2026-01-04T10:00:00Z', r: 0, result: 'be' }),
      makeTrade({ openedAt: '2026-01-05T10:00:00Z', r: 4, result: 'win' }),
    ];
    h.useFilteredTrades.mockImplementation(() => ({
      filtered: trades,
      filters: FILTERS,
      activeCount: 0,
    }));

    renderDashboard();
    await screen.findByText('Performance — R');

    expect(screen.getByText('Total R')).toBeInTheDocument();
    expect(screen.getByText('+8.00R')).toBeInTheDocument();
    expect(screen.getByText('Avg R')).toBeInTheDocument();
    expect(screen.getByText('+1.60R')).toBeInTheDocument();
    expect(screen.queryByText('Avg R:R')).not.toBeInTheDocument();
  });

  it('totals and averages Journal Trade P&L (not account values)', async () => {
    renderDashboard();
    await screen.findByText('Performance — P&L');

    // 100 + 900 - 300 = 700 (t4 has no P&L and must not count as 0)
    expect(screen.getByText('+$700.00')).toBeInTheDocument();
    // 700 / 3 trades that recorded P&L
    expect(screen.getByText('+$233.33')).toBeInTheDocument();
  });

  it('shows both R and P&L in Recent trades for the same row', async () => {
    renderDashboard();
    await screen.findByText('Recent trades');

    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'R' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'P&L' })).toBeInTheDocument();

    const nqRow = within(table).getByText('NQ').closest('tr')!;
    expect(within(nqRow).getByText('+5.00R')).toBeInTheDocument();
    expect(within(nqRow).getByText('+$100.00')).toBeInTheDocument();

    const siRow = within(table).getByText('SI').closest('tr')!;
    expect(within(siRow).getByText('-2.00R')).toBeInTheDocument();
    expect(within(siRow).getByText('-$300.00')).toBeInTheDocument();
  });

  it('renders an em dash (never NaN) for a trade with no P&L', async () => {
    renderDashboard();
    await screen.findByText('Recent trades');

    const table = screen.getByRole('table');
    const clRow = within(table).getByText('CL').closest('tr')!;
    expect(within(clRow).getByText('—')).toBeInTheDocument();
    expect(within(clRow).queryByText(/NaN/)).toBeNull();
  });

  it('switches Best/Worst setup when the metric toggle changes', async () => {
    renderDashboard();
    await screen.findByText('Performance — R');

    expect(screen.getByText('+5.00R avg R')).toBeInTheDocument();
    expect(screen.getByText('-2.00R avg R')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cumulative P&L' }));

    expect(screen.getByText('+$900.00 avg P&L')).toBeInTheDocument();
    expect(screen.getByText('-$300.00 avg P&L')).toBeInTheDocument();
    expect(screen.queryByText('+5.00R avg R')).toBeNull();
  });

  it('shows both R and P&L in a Weekdays row', async () => {
    renderDashboard();
    await screen.findByText('Weekdays');

    const satRow = screen.getByText('Sat').closest('div')!;
    expect(within(satRow).getByText('-2.00R')).toBeInTheDocument();
    expect(within(satRow).getByText('-$300.00')).toBeInTheDocument();
  });
});
