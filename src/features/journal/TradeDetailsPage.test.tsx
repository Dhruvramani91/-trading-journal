import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Trade } from '@/domain/models/trade';

const mocks = vi.hoisted(() => ({
  getTrade: vi.fn(),
  listTrades: vi.fn(),
  removeTrade: vi.fn(),
  removeFromStore: vi.fn(),
  storeState: {} as {
    trades: Trade[];
    ownerId: string | null;
    loadingOwnerId: string | null;
    loaded: boolean;
    loading: boolean;
    load: (ownerId?: string) => Promise<void>;
  },
  getStoreState: vi.fn(),
  authState: { user: { id: 'user-1' } as { id: string } | null },
}));

vi.mock('@/data/supabaseTradeRepository', () => ({
  tradeRepository: {
    get: mocks.getTrade,
    list: mocks.listTrades,
  },
}));

vi.mock('@/store/tradesStore', () => ({
  useTradesStore: Object.assign(
    vi.fn(() => ({ remove: mocks.removeFromStore })),
    { getState: mocks.getStoreState },
  ),
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => mocks.authState,
}));

import { TradeDetailsPage } from './TradeDetailsPage';

const trade: Trade = {
  id: 'trade-1',
  templateId: 'default',
  number: 7,
  openedAt: '2026-01-01T12:00:00.000Z',
  instrument: 'ES',
  direction: 'long',
  result: 'win',
  pnl: 125,
  r: 1,
  durationMin: 15,
  templateData: {},
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
};

function renderTradeDetails() {
  return render(
    <MemoryRouter initialEntries={['/journal/trade-1']}>
      <Routes>
        <Route path="/journal/:id" element={<TradeDetailsPage />} />
        <Route path="/journal" element={<div>Journal page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TradeDetailsPage data loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authState.user = { id: 'user-1' };
    mocks.storeState = {
      trades: [],
      ownerId: null,
      loadingOwnerId: null,
      loaded: false,
      loading: false,
      load: vi.fn().mockResolvedValue(undefined),
    };
    mocks.getStoreState.mockImplementation(() => mocks.storeState);
    mocks.getTrade.mockResolvedValue(trade);
    mocks.listTrades.mockResolvedValue([trade]);
    mocks.removeFromStore.mockResolvedValue(undefined);
  });

  it('reuses an already-loaded trade owned by the current user', async () => {
    mocks.storeState = {
      ...mocks.storeState,
      trades: [trade],
      ownerId: 'user-1',
      loaded: true,
    };

    renderTradeDetails();

    expect(await screen.findByText('Trade #7')).toBeInTheDocument();
    expect(mocks.getTrade).not.toHaveBeenCalled();
    expect(mocks.listTrades).not.toHaveBeenCalled();
    expect(mocks.storeState.load).not.toHaveBeenCalled();
  });

  it('fetches only the requested trade when it is not already in the store', async () => {
    renderTradeDetails();

    expect(await screen.findByText('Trade #7')).toBeInTheDocument();
    expect(mocks.getTrade).toHaveBeenCalledWith('trade-1');
    expect(mocks.listTrades).not.toHaveBeenCalled();
    expect(mocks.storeState.load).not.toHaveBeenCalled();
  });

  it('joins a relevant in-flight store load instead of issuing duplicate reads', async () => {
    mocks.storeState = {
      ...mocks.storeState,
      loading: true,
      loadingOwnerId: 'user-1',
      load: vi.fn(async () => {
        mocks.storeState = {
          ...mocks.storeState,
          trades: [trade],
          ownerId: 'user-1',
          loadingOwnerId: null,
          loaded: true,
          loading: false,
        };
      }),
    };

    renderTradeDetails();

    expect(await screen.findByText('Trade #7')).toBeInTheDocument();
    expect(mocks.storeState.load).toHaveBeenCalledWith('user-1');
    expect(mocks.getTrade).not.toHaveBeenCalled();
    expect(mocks.listTrades).not.toHaveBeenCalled();
  });

  it('fetches an individual trade rather than reusing another user’s store data', async () => {
    mocks.storeState = {
      ...mocks.storeState,
      trades: [trade],
      ownerId: 'user-2',
      loaded: true,
    };
    mocks.getTrade.mockResolvedValue(null);

    renderTradeDetails();

    expect(await screen.findByText('Trade not found.')).toBeInTheDocument();
    expect(mocks.getTrade).toHaveBeenCalledWith('trade-1');
    expect(mocks.listTrades).not.toHaveBeenCalled();
  });

  it('keeps the existing edit and delete actions', async () => {
    mocks.storeState = {
      ...mocks.storeState,
      trades: [trade],
      ownerId: 'user-1',
      loaded: true,
    };
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderTradeDetails();

    expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/journal/trade-1/edit',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mocks.removeFromStore).toHaveBeenCalledWith('trade-1', trade);
      expect(screen.getByText('Journal page')).toBeInTheDocument();
    });

    expect(confirm).toHaveBeenCalledWith('Delete this trade?');
    confirm.mockRestore();
  });

  it('does not trust cached trades when unauthenticated', async () => {
    mocks.authState.user = null;
    mocks.storeState = {
      ...mocks.storeState,
      trades: [trade],
      ownerId: 'user-1',
      loaded: true,
    };
    mocks.getTrade.mockResolvedValue(null);

    renderTradeDetails();

    expect(await screen.findByText('Trade not found.')).toBeInTheDocument();
    expect(mocks.getTrade).toHaveBeenCalledWith('trade-1');
  });
});
