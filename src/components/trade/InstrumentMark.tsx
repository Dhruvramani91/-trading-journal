import { cn } from '@/lib/cn';

const INSTRUMENT_ASSETS: Record<string, string> = {
  GC: '/instruments/gc.svg',
  SI: '/instruments/si.svg',
  NQ: '/instruments/nq.svg',
  ES: '/instruments/es.svg',
  YM: '/instruments/ym.svg',
  CL: '/instruments/cl.svg',
  RB: '/instruments/rb.svg',
  HO: '/instruments/ho.svg',
};

export function InstrumentMark({ instrument, className }: { instrument: string; className?: string }) {
  const symbol = instrument.trim().toUpperCase();
  const asset = INSTRUMENT_ASSETS[symbol];

  return (
    <span
      aria-label={`${symbol} instrument`}
      title={symbol}
      className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-bg-3', className)}
    >
      {asset ? (
        <img src={asset} alt="" aria-hidden="true" className="h-full w-full rounded-full object-cover" />
      ) : symbol === 'EURUSD' || symbol === 'GBPUSD' ? (
        <span className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
          <img src={symbol === 'EURUSD' ? '/instruments/eu.svg' : '/instruments/gb.svg'} alt="" className="absolute left-0 top-0 h-4 w-4 rounded-full border border-bg-1 object-cover" />
          <img src="/instruments/us.svg" alt="" className="absolute bottom-0 right-0 h-4 w-4 rounded-full border border-bg-1 object-cover" />
        </span>
      ) : (
        <span aria-hidden="true" className="font-mono text-[10px] font-bold text-accent">{symbol.slice(0, 3)}</span>
      )}
    </span>
  );
}
