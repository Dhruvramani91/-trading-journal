import { describe, it, expect } from 'vitest';
import { tradeRepository } from './supabaseTradeRepository';

describe('supabaseTradeRepository.replaceAll (data safety)', () => {
  it('rejects before touching the database instead of delete-then-insert', async () => {
    // Supabase is NOT configured in the test environment. If replaceAll still
    // reached the client it would throw the configuration error raised by
    // `getUserId()` — arriving there would mean the destructive
    // delete-then-insert path has been reintroduced. Asserting the
    // deprecation message proves it bails out first, so existing rows are
    // never deleted and the journal cannot be silently wiped.
    await expect(tradeRepository.replaceAll([])).rejects.toThrow(
      /cannot run atomically and would risk wiping the journal/i
    );
  });
});
