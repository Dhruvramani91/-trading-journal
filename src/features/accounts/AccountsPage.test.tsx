import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

const mockCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockRemove = vi.hoisted(() => vi.fn());
const mockList = vi.hoisted(() => vi.fn());
const mockListForUser = vi.hoisted(() => vi.fn());

const mockListForAccount = vi.hoisted(() => vi.fn());
const mockListForAccounts = vi.hoisted(() => vi.fn());
const mockListTradeSummaries = vi.hoisted(() => vi.fn());
const mockTradesStore = vi.hoisted(() => ({
  state: {} as {
    trades: unknown[];
    ownerId: string | null;
    loaded: boolean;
    loading: boolean;
    error: string | null;
    load: (ownerId?: string) => Promise<void>;
  },
  getState: vi.fn(),
}));
const mockAuthState = vi.hoisted(() => ({
  user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
}));

vi.mock('@/data/supabaseAccountRepository', () => ({
  accountRepository: {
    list: mockList,
    listForUser: mockListForUser,
    create: mockCreate,
    update: mockUpdate,
    remove: mockRemove,
  },
}));

vi.mock('@/data/supabaseAccountTradeAttachmentRepository', () => ({
  accountTradeAttachmentRepository: {
    listForAccount: mockListForAccount,
    listForAccounts: mockListForAccounts,
  },
}));

vi.mock('@/data/supabaseAccountTradeSummaryRepository', () => ({
  accountTradeSummaryRepository: {
    listForAccountSummaries: mockListTradeSummaries,
  },
}));

vi.mock('@/store/tradesStore', () => ({
  useTradesStore: { getState: mockTradesStore.getState },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => ({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    }),
  },
  isSupabaseConfigured: true,
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => mockAuthState,
}));

vi.mock('@/store/sidebarStore', () => ({
  useSidebarStore: () => ({
    collapsed: false,
    width: 240,
    toggleCollapse: vi.fn(),
    setCollapsed: vi.fn(),
    setWidth: vi.fn(),
  }),
}));

vi.mock('@/lib/chartTheme', () => ({
  useChartTheme: () => ({
    primary: '#3b82f6',
    grid: '#374151',
    text: '#9ca3af',
  }),
}));

const mockAccounts = [
  {
    id: 'acc-1',
    userId: 'user-1',
    name: 'Trading Account',
    accountType: 'futures' as const,
    phase: 'evaluation' as const,
    result: 'active' as const,
    accountSize: 50000,
    ruleMode: 'standard' as const,
    profitTarget: null,
    maxDrawdown: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

async function renderWithAccounts(
  initialAccounts: typeof mockAccounts,
  attachments: unknown[] = [],
  trades: unknown[] = [],
) {
  mockListForUser.mockResolvedValue(initialAccounts);
  mockListForAccount.mockResolvedValue(attachments);
  mockListForAccounts.mockResolvedValue(attachments);
  mockListTradeSummaries.mockResolvedValue(trades);
  mockCreate.mockResolvedValue({ ...(initialAccounts[0] ?? {}), name: 'New Account' });
  mockUpdate.mockResolvedValue({ ...(initialAccounts[0] ?? {}), name: 'Updated Account' });

  const { AccountsPage } = await import('./AccountsPage');

  const utils = render(
    <BrowserRouter>
      <AccountsPage />
    </BrowserRouter>,
  );

  await waitFor(() => {
    expect(mockListForUser).toHaveBeenCalled();
  });

  return utils;
}

describe('AccountsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.user = { id: 'user-1', name: 'Test User', email: 'test@test.com' };
    mockTradesStore.state = {
      trades: [],
      ownerId: null,
      loaded: false,
      loading: false,
      error: null,
      load: vi.fn().mockResolvedValue(undefined),
    };
    mockTradesStore.getState.mockImplementation(() => mockTradesStore.state);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders empty state when no accounts exist', async () => {
    await renderWithAccounts([]);

    expect(screen.getByText('No Futures accounts yet')).toBeInTheDocument();
    expect(
      screen.getByText(/Add an account to track its profit target/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Add account' })
    ).toBeInTheDocument();
  });

  it('renders account cards when accounts exist', async () => {
    await renderWithAccounts(mockAccounts, [{
      id: 'attachment-1',
      accountId: 'acc-1',
      tradeId: 'trade-1',
      userId: 'user-1',
      accountPnl: null,
      accountR: 1.5,
      quantity: null,
      attachedAt: '2026-01-02T00:00:00.000Z',
    }]);

    const accountCard = screen.getByText('Trading Account').closest('article');
    expect(accountCard).not.toBeNull();

    expect(within(accountCard!).getByText(/Futures/)).toBeInTheDocument();
    expect(within(accountCard!).getByText(/50K/)).toBeInTheDocument();
    expect(within(accountCard!).getByText(/Standard rules/)).toBeInTheDocument();
    expect(within(accountCard!).getByText('View Account')).toBeInTheDocument();
  });

  it('uses linked journal trade P&L for legacy attachments without account P&L', async () => {
    await renderWithAccounts(
      mockAccounts,
      [{
        id: 'attachment-1',
        accountId: 'acc-1',
        tradeId: 'trade-1',
        userId: 'user-1',
        accountPnl: null,
        accountR: 1.5,
        quantity: null,
        attachedAt: '2026-01-02T00:00:00.000Z',
      }],
      [{
        id: 'trade-1',
        pnl: 1250,
        openedAt: '2026-01-02T12:00:00.000Z',
      }],
    );

    expect(await screen.findAllByText('+$1,250.00')).toHaveLength(2);
  });

  it('reuses loaded current-user trades without the duplicate trade-summary request', async () => {
    mockListForAccounts.mockResolvedValue([{
      id: 'attachment-1',
      accountId: 'acc-1',
      tradeId: 'trade-1',
      userId: 'user-1',
      accountPnl: null,
      accountR: 1.5,
      quantity: null,
      attachedAt: '2026-01-02T00:00:00.000Z',
    }]);
    mockTradesStore.state = {
      trades: [{
        id: 'trade-1',
        pnl: 1250,
        openedAt: '2026-01-02T12:00:00.000Z',
      }],
      ownerId: 'user-1',
      loaded: true,
      loading: false,
      error: null,
      load: vi.fn().mockResolvedValue(undefined),
    };

    await renderWithAccounts(mockAccounts, [{
      id: 'attachment-1',
      accountId: 'acc-1',
      tradeId: 'trade-1',
      userId: 'user-1',
      accountPnl: null,
      accountR: null,
      quantity: null,
      attachedAt: '2026-01-02T00:00:00.000Z',
    }]);

    expect(mockListForUser).toHaveBeenCalledWith('user-1');
    expect(mockListForAccounts).toHaveBeenCalledWith(['acc-1'], 'user-1');
    expect(mockListTradeSummaries).not.toHaveBeenCalled();
    expect(await screen.findAllByText('+$1,250.00')).toHaveLength(2);
  });

  it('renders identical account P&L from cached trades and the summary-query fallback', async () => {
    const attachments = [{
      id: 'attachment-1',
      accountId: 'acc-1',
      tradeId: 'trade-1',
      userId: 'user-1',
      accountPnl: null,
      accountR: 1.5,
      quantity: null,
      attachedAt: '2026-01-02T00:00:00.000Z',
    }];
    const tradeSummary = {
      id: 'trade-1',
      pnl: 1250,
      openedAt: '2026-01-02T12:00:00.000Z',
    };

    const fallback = await renderWithAccounts(mockAccounts, attachments, [tradeSummary]);
    expect(await screen.findAllByText('+$1,250.00')).toHaveLength(2);
    expect(mockTradesStore.state.load).not.toHaveBeenCalled();
    expect(mockListTradeSummaries).toHaveBeenCalledWith('user-1');
    const fallbackCardText = fallback.container.querySelector('article')?.textContent;
    fallback.unmount();
    mockListTradeSummaries.mockClear();

    mockTradesStore.state = {
      trades: [tradeSummary],
      ownerId: 'user-1',
      loaded: true,
      loading: false,
      error: null,
      load: vi.fn().mockResolvedValue(undefined),
    };

    const cached = await renderWithAccounts(mockAccounts, attachments, []);
    expect(await screen.findAllByText('+$1,250.00')).toHaveLength(2);
    expect(cached.container.querySelector('article')?.textContent).toBe(fallbackCardText);
    expect(mockListTradeSummaries).not.toHaveBeenCalled();
  });

  it('waits for an in-flight trades-store load before using its trades', async () => {
    let finishLoad!: () => void;
    const inFlight = new Promise<void>((resolve) => {
      finishLoad = resolve;
    });
    const pendingStoreState = {
      trades: [] as unknown[],
      ownerId: null as string | null,
      loaded: false,
      loading: true,
      error: null as string | null,
      load: vi.fn(async (ownerId?: string) => {
        await inFlight;
        Object.assign(pendingStoreState, {
          trades: [{ id: 'trade-1', pnl: 1250, openedAt: '2026-01-02T12:00:00.000Z' }],
          ownerId,
          loaded: true,
          loading: false,
        });
      }),
    };
    mockTradesStore.state = pendingStoreState;
    mockListForAccounts.mockResolvedValue([{
      id: 'attachment-1',
      accountId: 'acc-1',
      tradeId: 'trade-1',
      userId: 'user-1',
      accountPnl: null,
      accountR: null,
      quantity: null,
      attachedAt: '2026-01-02T00:00:00.000Z',
    }]);

    await renderWithAccounts(mockAccounts, [{
      id: 'attachment-1',
      accountId: 'acc-1',
      tradeId: 'trade-1',
      userId: 'user-1',
      accountPnl: null,
      accountR: null,
      quantity: null,
      attachedAt: '2026-01-02T00:00:00.000Z',
    }], [{
      id: 'trade-1',
      pnl: 1250,
      openedAt: '2026-01-02T12:00:00.000Z',
    }]);
    await waitFor(() => expect(pendingStoreState.load).toHaveBeenCalledWith('user-1'));
    expect(mockListTradeSummaries).not.toHaveBeenCalled();

    finishLoad();

    expect(await screen.findAllByText('+$1,250.00')).toHaveLength(2);
    expect(mockListTradeSummaries).not.toHaveBeenCalled();
  });

  it('falls back to trade summaries when the in-flight store load fails', async () => {
    const failedStoreState = {
      trades: [] as unknown[],
      ownerId: null as string | null,
      loaded: false,
      loading: true,
      error: null as string | null,
      load: vi.fn(async () => {
        failedStoreState.loading = false;
        failedStoreState.error = 'Trade load failed';
      }),
    };
    mockTradesStore.state = failedStoreState;
    mockListForAccounts.mockResolvedValue([{
      id: 'attachment-1',
      accountId: 'acc-1',
      tradeId: 'trade-1',
      userId: 'user-1',
      accountPnl: null,
      accountR: null,
      quantity: null,
      attachedAt: '2026-01-02T00:00:00.000Z',
    }]);
    mockListTradeSummaries.mockResolvedValue([{
      id: 'trade-1',
      pnl: 1250,
      openedAt: '2026-01-02T12:00:00.000Z',
    }]);

    await renderWithAccounts(mockAccounts, [{
      id: 'attachment-1',
      accountId: 'acc-1',
      tradeId: 'trade-1',
      userId: 'user-1',
      accountPnl: null,
      accountR: null,
      quantity: null,
      attachedAt: '2026-01-02T00:00:00.000Z',
    }], [{
      id: 'trade-1',
      pnl: 1250,
      openedAt: '2026-01-02T12:00:00.000Z',
    }]);

    expect(failedStoreState.load).toHaveBeenCalledWith('user-1');
    expect(mockListTradeSummaries).toHaveBeenCalledWith('user-1');
    expect(await screen.findAllByText('+$1,250.00')).toHaveLength(2);
  });

  it('does not use trades cached for a previous authenticated user', async () => {
    mockAuthState.user = { id: 'user-2', name: 'Other User', email: 'other@test.com' };
    const userTwoAccounts = mockAccounts.map((account) => ({ ...account, userId: 'user-2' }));
    mockListForUser.mockResolvedValue(userTwoAccounts);
    mockListForAccounts.mockResolvedValue([{
      id: 'attachment-2',
      accountId: 'acc-1',
      tradeId: 'trade-1',
      userId: 'user-2',
      accountPnl: null,
      accountR: null,
      quantity: null,
      attachedAt: '2026-01-02T00:00:00.000Z',
    }]);
    mockListTradeSummaries.mockResolvedValue([{
      id: 'trade-1',
      pnl: 250,
      openedAt: '2026-01-02T12:00:00.000Z',
    }]);
    mockTradesStore.state = {
      trades: [{ id: 'trade-1', pnl: 9999, openedAt: '2026-01-02T12:00:00.000Z' }],
      ownerId: 'user-1',
      loaded: true,
      loading: false,
      error: null,
      load: vi.fn().mockResolvedValue(undefined),
    };

    await renderWithAccounts(userTwoAccounts, [{
      id: 'attachment-2',
      accountId: 'acc-1',
      tradeId: 'trade-1',
      userId: 'user-2',
      accountPnl: null,
      accountR: null,
      quantity: null,
      attachedAt: '2026-01-02T00:00:00.000Z',
    }], [{
      id: 'trade-1',
      pnl: 250,
      openedAt: '2026-01-02T12:00:00.000Z',
    }]);

    expect(mockListForUser).toHaveBeenCalledWith('user-2');
    expect(mockListForAccounts).toHaveBeenCalledWith(['acc-1'], 'user-2');
    expect(mockListTradeSummaries).toHaveBeenCalledWith('user-2');
    expect(await screen.findAllByText('+$250.00')).toHaveLength(2);
    expect(screen.queryByText('+$9,999.00')).not.toBeInTheDocument();
  });

  it('starts attachment and trade-summary requests together after accounts load', async () => {
    let resolveAccounts!: (accounts: typeof mockAccounts) => void;
    const accountsPromise = new Promise<typeof mockAccounts>((resolve) => {
      resolveAccounts = resolve;
    });
    let resolveAttachments!: (attachments: unknown[]) => void;
    const attachmentsPromise = new Promise<unknown[]>((resolve) => {
      resolveAttachments = resolve;
    });
    let resolveTradeSummaries!: (trades: unknown[]) => void;
    const tradeSummariesPromise = new Promise<unknown[]>((resolve) => {
      resolveTradeSummaries = resolve;
    });

    mockListForUser.mockReturnValue(accountsPromise);
    mockListForAccounts.mockReturnValue(attachmentsPromise);
    mockListTradeSummaries.mockReturnValue(tradeSummariesPromise);

    const { AccountsPage } = await import('./AccountsPage');
    render(
      <BrowserRouter>
        <AccountsPage />
      </BrowserRouter>,
    );

    expect(mockListForAccounts).not.toHaveBeenCalled();
    expect(mockListTradeSummaries).not.toHaveBeenCalled();

    resolveAccounts(mockAccounts);

    await waitFor(() => {
      expect(mockListForAccounts).toHaveBeenCalledWith(['acc-1'], 'user-1');
      expect(mockListTradeSummaries).toHaveBeenCalledTimes(1);
    });

    resolveAttachments([]);
    resolveTradeSummaries([]);

    expect(await screen.findByText('Trading Account')).toBeInTheDocument();
  });

  it('opens the create account form when "Add Account" is clicked', async () => {
    await renderWithAccounts([]);

    const createBtn = screen.getByRole('button', { name: 'Add Account' });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Add Futures account')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('e.g. My 50K account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add account' })).toBeInTheDocument();
  });

  it('opens the edit account form with pre-filled values', async () => {
    await renderWithAccounts(mockAccounts);

    await waitFor(() => {
      expect(screen.getByTitle('More actions for Trading Account')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('More actions for Trading Account'));

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Edit account' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit account' }));

    await waitFor(() => {
      expect(screen.getByText('Edit account')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Trading Account')).toBeInTheDocument();
    expect(screen.getByDisplayValue('$50,000')).toBeInTheDocument();
  });

  it('calls create with correct input when form is submitted', async () => {
    await renderWithAccounts([]);

    const createBtn = screen.getByRole('button', { name: 'Add Account' });
    fireEvent.click(createBtn);

    const nameInput = await screen.findByPlaceholderText('e.g. My 50K account');

    const sizeSelect = await screen.findByDisplayValue('$25,000');
    fireEvent.change(sizeSelect, { target: { value: '100000' } });

    fireEvent.change(nameInput, { target: { value: 'New Account' } });

    const form = nameInput.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        name: 'New Account',
        accountType: 'futures',
        phase: 'evaluation',
        result: 'active',
        accountSize: 100000,
        ruleMode: 'standard',
        profitTarget: 6000,
        maxDrawdown: 3000,
      });
    }, { timeout: 3000 });
  });

  it('calls update with correct input when editing', async () => {
    await renderWithAccounts(mockAccounts);

    await waitFor(() => {
      expect(screen.getByTitle('More actions for Trading Account')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('More actions for Trading Account'));

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit account' }));

    const nameInput = await screen.findByDisplayValue('Trading Account');
    fireEvent.change(nameInput, { target: { value: 'Updated Account' } });

    const form = nameInput.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('acc-1', {
        name: 'Updated Account',
        accountType: 'futures',
        phase: 'evaluation',
        result: 'active',
        accountSize: 50000,
        ruleMode: 'standard',
        profitTarget: 3000,
        maxDrawdown: 2000,
      });
    }, { timeout: 3000 });
  });

  it('shows undo toast when delete is requested', async () => {
    await renderWithAccounts(mockAccounts);

    await waitFor(() => {
      expect(screen.getByTitle('More actions for Trading Account')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('More actions for Trading Account'));

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Delete account' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete account' }));

    await waitFor(() => {
      expect(screen.getByText(/Deleted/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('calls remove after undo window expires', async () => {
    vi.useFakeTimers();

    try {
      mockListForUser.mockResolvedValue(mockAccounts);
      mockListForAccounts.mockResolvedValue([]);
      mockRemove.mockResolvedValue(undefined);

      const { AccountsPage } = await import('./AccountsPage');
      render(
        <BrowserRouter>
          <AccountsPage />
        </BrowserRouter>,
      );

      await vi.advanceTimersByTimeAsync(0);

      await vi.waitFor(() => {
        expect(screen.getByTitle('More actions for Trading Account')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTitle('More actions for Trading Account'));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Delete account' }));

      await vi.waitFor(() => {
        expect(screen.getByText(/Deleted/)).toBeInTheDocument();
      });

      await vi.advanceTimersByTimeAsync(6000);

      await vi.waitFor(() => {
        expect(mockRemove).toHaveBeenCalledWith('acc-1');
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('closes the create form when cancel is clicked', async () => {
    await renderWithAccounts([]);

    const createBtn = screen.getByRole('button', { name: 'Add Account' });
    fireEvent.click(createBtn);

    const nameInput = await screen.findByPlaceholderText('e.g. My 50K account');
    expect(nameInput).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(screen.queryByPlaceholderText('e.g. My 50K account')).not.toBeInTheDocument();
  });

  it('surfaces attachment load failures instead of converting them to an empty list', async () => {
    mockListForUser.mockResolvedValue(mockAccounts);
    mockListForAccounts.mockRejectedValue(
      new Error('Supabase account attachments list: network down')
    );

    const { AccountsPage } = await import('./AccountsPage');
    render(
      <BrowserRouter>
        <AccountsPage />
      </BrowserRouter>,
    );

    // The failure must be visible — a DB/network error is not "no attachments".
    const alerts = await screen.findAllByRole('alert');
    expect(
      alerts.some((el) => (el.textContent ?? '').includes('network down'))
    ).toBe(true);
  });

  it('surfaces trade-summary load failures instead of treating them as empty trades', async () => {
    mockListForUser.mockResolvedValue(mockAccounts);
    mockListForAccounts.mockResolvedValue([]);
    mockListTradeSummaries.mockRejectedValue(
      new Error('Supabase account trade summaries list: network down')
    );

    const { AccountsPage } = await import('./AccountsPage');
    render(
      <BrowserRouter>
        <AccountsPage />
      </BrowserRouter>,
    );

    const alerts = await screen.findAllByRole('alert');
    expect(
      alerts.some((el) => (el.textContent ?? '').includes('network down'))
    ).toBe(true);
  });

  it('shows validation error for empty account name', async () => {
    await renderWithAccounts([]);

    const createBtn = screen.getByRole('button', { name: 'Add Account' });
    fireEvent.click(createBtn);

    const nameInput = await screen.findByPlaceholderText('e.g. My 50K account');
    fireEvent.change(nameInput, { target: { value: '' } });

    const form = nameInput.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText('Enter an account name.')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
