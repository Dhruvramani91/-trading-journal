import type { TemplateDefinition } from '@/domain/models/trade';

/**
 * General IFVG journal template. Its choices describe common IFVG concepts,
 * while users can customize a copy to fit their own entry and management rules.
 */
export const IFVG_TEMPLATE: TemplateDefinition = {
  id: 'ifvg-model-v1',
  name: 'IFVG Model',
  description: 'Record the context, inversion confirmation, entry approach, and management of an IFVG setup.',
  photoCount: 3,
  fields: [
    { key: 'higherTimeframeBias', label: 'Higher-timeframe bias', group: 'Market context', type: 'enum', options: ['Bullish', 'Bearish', 'Neutral', 'Unclear'], inTable: true, inStats: true },
    { key: 'liquidityEvent', label: 'Liquidity event', group: 'Market context', type: 'enum', options: ['Buy-side swept', 'Sell-side swept', 'Both sides swept', 'No clear sweep'], inStats: true },
    { key: 'liquidityReference', label: 'Liquidity reference', group: 'Market context', type: 'enum', options: ['Previous day high / low', 'Equal highs / lows', 'Session high / low', 'Swing high / low', 'Other'], inStats: true },
    { key: 'session', label: 'Trading session', group: 'Market context', type: 'enum', options: ['Asia', 'London', 'New York AM', 'New York PM', 'Other'], inStats: true },
    { key: 'originalGapDirection', label: 'Original FVG direction', group: 'IFVG setup', type: 'enum', options: ['Bullish FVG', 'Bearish FVG'], inTable: true, inStats: true },
    { key: 'ifvgTimeframe', label: 'IFVG timeframe', group: 'IFVG setup', type: 'enum', options: ['30 seconds', '1 minute', '2 minutes', '3 minutes', '5 minutes', '15 minutes', 'Other'], inStats: true },
    { key: 'inversionConfirmation', label: 'How was inversion confirmed?', group: 'IFVG setup', type: 'enum', options: ['Candle body closed through the gap', 'Wick traded through the gap', 'Other'], inStats: true },
    { key: 'entryApproach', label: 'Entry approach', group: 'Entry & management', type: 'enum', options: ['At inversion close', 'Retest of the IFVG', 'Lower-timeframe confirmation', 'Other'], inTable: true, inStats: true },
    { key: 'retestConfirmation', label: 'Retest / rejection confirmation', group: 'Entry & management', type: 'enum', options: ['Yes', 'No', 'Not applicable'], inStats: true },
    { key: 'stopBasis', label: 'Stop placement basis', group: 'Entry & management', type: 'enum', options: ['Beyond the IFVG', 'Beyond a swing high / low', 'Fixed risk', 'Other'], inStats: true },
    { key: 'targetBasis', label: 'Target basis', group: 'Entry & management', type: 'enum', options: ['Opposing liquidity', 'Opposing FVG / imbalance', 'Fixed R multiple', 'Other'], inStats: true },
    { key: 'followedIfvgRules', label: 'Followed my IFVG rules', group: 'Entry & management', type: 'enum', options: ['Yes', 'Partially', 'No'], inStats: true },
  ],
};
