import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof window !== 'undefined' && !window.IntersectionObserver) {
  class MockIntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    private callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      this.callback(
        [
          {
            isIntersecting: true,
            intersectionRatio: 1,
            target,
            boundingClientRect: target.getBoundingClientRect(),
            intersectionRect: target.getBoundingClientRect(),
            rootBounds: null,
            time: Date.now(),
          },
        ],
        this as unknown as IntersectionObserver,
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }

  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
}

vi.mock('@number-flow/react', () => {
  return {
    default: ({
      value,
      prefix = '',
      suffix = '',
      format,
    }: {
      value: number;
      prefix?: string;
      suffix?: string;
      format?: Intl.NumberFormatOptions;
    }) => {
      let str: string;
      if (format?.style === 'currency') {
        const sign = value > 0 && format.signDisplay === 'always' ? '+' : value < 0 ? '-' : '';
        const abs = Math.abs(value).toFixed(format.minimumFractionDigits ?? 2);
        str = `${sign}$${abs}`;
      } else if (typeof format?.minimumFractionDigits === 'number') {
        const sign = value > 0 && format?.signDisplay === 'always' ? '+' : '';
        str = `${sign}${value.toFixed(format.minimumFractionDigits)}`;
      } else {
        str = String(value);
      }
      return `${prefix}${str}${suffix}`;
    },
  };
});
