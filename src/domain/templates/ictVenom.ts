import type { TemplateDefinition } from '@/domain/models/trade';

/**
 * ICT Venom journal template based on the 2025 tutorial and the user's
 * reference videos. The field choices are customizable in a user's copy.
 */
export const ICT_VENOM_TEMPLATE: TemplateDefinition = {
  id: 'ict-venom-model-v1',
  name: 'ICT Venom Model',
  description: 'Track the pre-market range, liquidity raid, Venom confirmation, and entry execution.',
  photoCount: 3,
  fields: [
    { key: 'dailyBias', label: 'Directional bias', group: 'Context', type: 'enum', options: ['Bullish', 'Bearish', 'Neutral', 'Unclear'], inTable: true, inStats: true },
    { key: 'venomRangeHigh', label: 'Venom range high (8:00–9:30 ET)', group: 'Pre-market range', type: 'number' },
    { key: 'venomRangeLow', label: 'Venom range low (8:00–9:30 ET)', group: 'Pre-market range', type: 'number' },
    { key: 'expectedSweepSide', label: 'Expected liquidity raid', group: 'Pre-market range', type: 'enum', options: ['Buy-side above range high', 'Sell-side below range low', 'Unclear'], inStats: true },
    { key: 'sweptRangeSide', label: 'Range side swept after the open', group: 'Liquidity raid', type: 'enum', options: ['Buy-side / range high', 'Sell-side / range low', 'Both sides', 'Neither'], inTable: true, inStats: true },
    { key: 'venomConfirmation', label: 'Venom pattern confirmation', group: 'Liquidity raid', type: 'enum', options: ['Confirmed', 'Partial / unclear', 'Not confirmed'], inStats: true },
    { key: 'entryTrigger', label: 'Entry trigger', group: 'Entry & target', type: 'enum', options: ['Retrace to Venom candle close / CISD', 'First presented FVG', 'Venom order block retest', 'Aggressive entry during the raid', 'Other'], inTable: true, inStats: true },
    { key: 'entryTimeframe', label: 'Entry timeframe', group: 'Entry & target', type: 'enum', options: ['1 minute', '2 minutes', '3 minutes', '5 minutes', 'Other'], inStats: true },
    { key: 'targetBasis', label: 'Target basis', group: 'Entry & target', type: 'enum', options: ['Opposite side of the Venom range', 'External liquidity', 'Opening gap / consequent encroachment', 'Other'], inStats: true },
    { key: 'followedVenomModel', label: 'Followed the model', group: 'Review', type: 'enum', options: ['Yes', 'Partially', 'No'], inStats: true },
  ],
};
