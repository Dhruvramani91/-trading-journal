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

vi.mock('@/data/supabaseAccountRepository', () => ({
  accountRepository: {
    list: vi.fn().mockResolvedValue([
      { id: 'acc-1', name: '100K FTMO' },
    ]),
  },
}));

vi.mock('@/lib/chartTheme', () => ({
  useChartTheme: () => ({
    grid: '#eee', axisText: '#aaa', axisMuted: '#999', tickLine: '#ddd',
    referenceLine: '#000', accent: '#3b82f6', win: '#0a0', loss: '#a00', be: '#888',
    tooltipBg: '#fff', tooltipBorder: '#eee', tooltipShadow: '', tooltipText: '#000',
  }),
}));

// Stub recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Area: () => null,
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

const TRADES: Trade[] = [
  makeTrade({ id: 't1', number: 1, openedAt: '2026-01-01T10:00:00Z', instrument: 'NQ', r: 5, pnl: 100, result: 'win' }),
  makeTrade({ id: 't2', number: 2, openedAt: '2026-01-02T10:00:00Z', instrument: 'ES', r: 1, pnl: 900, result: 'win' }),
  makeTrade({ id: 't3', number: 3, openedAt: '2026-01-03T10:00:00Z', instrument: 'SI', r: -2, pnl: -300, result: 'loss', direction: 'short' }),
  makeTrade({ id: 't4', number: 4, openedAt: '2026-01-04T10:00:00Z', instrument: 'CL', r: 0, result: 'be' }),
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

describe('DashboardPage — upgraded layout & features', () => {
  beforeEach(() => {
    h.useTradesStore.mockImplementation((selector?: (s: { trades: Trade[] }) => unknown) =>
      selector ? selector({ trades: TRADES }) : { loaded: true, load: vi.fn(), trades: TRADES },
    );
    h.bootTradesStore.mockImplementation(() => undefined);
    h.useFilteredTrades.mockImplementation(() => ({ filtered: TRADES, filters: FILTERS, activeCount: 0 }));
    h.useAuthStore.mockImplementation(() => ({ user: { id: 'u1', name: 'Thomas Anderson', email: 't@t.com' } }));
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

  it('renders dynamic greeting and account switcher', async () => {
    renderDashboard();
    expect(screen.getByText(/Thomas/)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('All Accounts')).toBeInTheDocument();
  });

  it('renders top metric cards including Net P&L, Win %, Profit Factor and Avg win/loss', async () => {
    renderDashboard();
    expect(screen.getByText('Net P&L')).toBeInTheDocument();
    expect(screen.getAllByText('+$700.00').length).toBeGreaterThan(0);
    expect(screen.getByText('Trade win %')).toBeInTheDocument();
    expect(screen.getAllByText('Profit factor').length).toBeGreaterThan(0);
    expect(screen.getByText('Day win %')).toBeInTheDocument();
    expect(screen.getAllByText('Avg win/loss').length).toBeGreaterThan(0);
  });

  it('switches between P&L and Realized R metrics smoothly', async () => {
    renderDashboard();
    expect(screen.getByText('Net P&L')).toBeInTheDocument();
    expect(screen.getAllByText('+$700.00').length).toBeGreaterThan(0);

    // Click Realized R toggle
    const rToggle = screen.getByRole('button', { name: 'Realized R' });
    fireEvent.click(rToggle);

    expect(screen.getByText('Net Realized R')).toBeInTheDocument();
    expect(screen.getAllByText('+4.00R').length).toBeGreaterThan(0);
  });

  it('toggles privacy mask for financial numbers', async () => {
    renderDashboard();
    expect(screen.getAllByText('+$700.00').length).toBeGreaterThan(0);

    // Click Eye button
    const eyeBtn = screen.getByTitle('Hide sensitive balances');
    fireEvent.click(eyeBtn);

    expect(screen.getAllByText('***').length).toBeGreaterThan(0);
    expect(screen.queryByText('+$700.00')).toBeNull();
  });

  it('shows both R and P&L in Recent trades table', async () => {
    renderDashboard();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'R' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'P&L' })).toBeInTheDocument();

    const nqRow = within(table).getByText('NQ').closest('tr')!;
    expect(within(nqRow).getByText('+5.00R')).toBeInTheDocument();
    expect(within(nqRow).getByText('+$100.00')).toBeInTheDocument();

    const clRow = within(table).getByText('CL').closest('tr')!;
    expect(within(clRow).getByText('0.00R')).toBeInTheDocument();
    expect(within(clRow).getByText('—')).toBeInTheDocument();
  });

  it('renders Precision Score radar and period overview metrics', async () => {
    renderDashboard();
    expect(screen.getAllByText('Precision Score').length).toBeGreaterThan(0);
    expect(screen.getByText('Period overview')).toBeInTheDocument();
    expect(screen.getByText('Peak')).toBeInTheDocument();
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument();
    expect(screen.getByText('Streak')).toBeInTheDocument();
    expect(screen.getByText('Best Day')).toBeInTheDocument();
  });

  it('renders comparative breakdown cards', async () => {
    renderDashboard();
    expect(screen.getByText('Win rate by direction')).toBeInTheDocument();
    expect(screen.getByText('Avg RR by market')).toBeInTheDocument();
    expect(screen.getByText('Avg duration by direction')).toBeInTheDocument();
    expect(screen.getByText('Win rate by weekday')).toBeInTheDocument();
    expect(screen.getByText('Win rate by month')).toBeInTheDocument();
    expect(screen.getByText('Win rate by 4H candle')).toBeInTheDocument();
  });
});
