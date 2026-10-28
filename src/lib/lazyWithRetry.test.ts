import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isChunkLoadError, lazyWithRetry } from './lazyWithRetry';

describe('lazyWithRetry and isChunkLoadError', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('correctly identifies chunk load errors', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://example.com/asset.js'))).toBe(true);
    expect(isChunkLoadError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError(new Error('Loading chunk 4 failed'))).toBe(true);
    const chunkErr = new Error('Chunk failure');
    chunkErr.name = 'ChunkLoadError';
    expect(isChunkLoadError(chunkErr)).toBe(true);

    expect(isChunkLoadError(new Error('Normal component rendering error'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });

  it('successfully resolves non-failing modules', async () => {
    const mockComponent = () => null;
    const factory = vi.fn().mockResolvedValue({ default: mockComponent });
    const LazyComponent = lazyWithRetry(factory);

    expect(LazyComponent).toBeDefined();
    // React.lazy components have _payload and _init
    expect(typeof LazyComponent).toBe('object');
  });
});
