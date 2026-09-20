import type { Trade } from '@/domain/models/trade';
import { uid } from '@/lib/id';
import { ACTIVE_TEMPLATE_ID } from '@/domain/templates/registry';
import type { TradeRepository } from './repository';
import { SEED_TRADES } from './seed';

const STORAGE_KEY = 'tj:trades:v1';

/** Read all trades from localStorage; seed on first run. */
function readRaw(): Trade[] {
  if (typeof localStorage === 'undefined') return [...SEED_TRADES];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TRADES));
      return [...SEED_TRADES];
    }
    const parsed = JSON.parse(raw) as Trade[];
    if (!Array.isArray(parsed)) throw new Error('invalid');
    return parsed;
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_TRADES));
    return [...SEED_TRADES];
  }
}

function writeRaw(trades: Trade[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  // Notify any in-page subscribers (other tabs use `storage` event).
  for (const fn of listeners) fn();
}

type Listener = () => void;
const listeners = new Set<Listener>();

/** A simple localStorage-backed repository. */
export class LocalStorageTradeRepository implements TradeRepository {
  async list(): Promise<Trade[]> {
    return readRaw().sort(
      (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
    );
  }

  async get(id: string): Promise<Trade | null> {
    return readRaw().find((t) => t.id === id) ?? null;
  }

  async create(input: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trade> {
    const now = new Date().toISOString();
    const next: Trade = {
      ...input,
      templateId: input.templateId || ACTIVE_TEMPLATE_ID,
      id: uid('t_'),
      createdAt: now,
      updatedAt: now,
    };
    const trades = [next, ...readRaw()];
    writeRaw(trades);
    return next;
  }

  async update(id: string, patch: Partial<Trade>): Promise<Trade> {
    const trades = readRaw();
    const idx = trades.findIndex((t) => t.id === id);
    if (idx < 0) throw new Error(`Trade ${id} not found`);
    const current = trades[idx]!;
    const updated: Trade = {
      ...current,
      ...patch,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    };
    trades[idx] = updated;
    writeRaw(trades);
    return updated;
  }

  async remove(id: string): Promise<void> {
    writeRaw(readRaw().filter((t) => t.id !== id));
  }

  async replaceAll(next: Trade[]): Promise<void> {
    writeRaw(next);
  }

  subscribe(listener: () => void): () => void {
    listeners.add(listener);

    // Cross-tab updates.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) listener();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
    }
    return () => {
      listeners.delete(listener);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', onStorage);
      }
    };
  }
}

/** Singleton instance — easy to swap later via a provider. */
export const tradeRepository: TradeRepository = new LocalStorageTradeRepository();

/** Test/debug helper — reset back to seed data. */
export function resetToSeed(): void {
  writeRaw([...SEED_TRADES]);
}
