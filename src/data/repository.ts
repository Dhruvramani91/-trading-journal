import type { Trade } from '@/domain/models/trade';

/**
 * TradeRepository is the single seam between the app and persistence.
 * The UI / analytics code talks to this interface only — no direct storage access.
 *
 * Phase 2 ships a `LocalStorageTradeRepository` (browser-only, synchronous-shaped async API).
 * Phase 11 will introduce a `HttpTradeRepository` (REST / DB-backed) that implements the same interface.
 */
export interface TradeRepository {
  list(): Promise<Trade[]>;
  get(id: string): Promise<Trade | null>;
  create(input: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trade>;
  update(id: string, patch: Partial<Trade>): Promise<Trade>;
  remove(id: string): Promise<void>;
  /** Replace the entire store — used by seed / import flows. */
  replaceAll(trades: Trade[]): Promise<void>;
  /** Subscribe to changes; returns an unsubscribe function. */
  subscribe?(listener: () => void): () => void;
}
