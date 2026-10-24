import type { TemplateDefinition } from '@/domain/models/trade';

/**
 * ICT 2022 Model journal fields. The choices are intentionally editable in a
 * user's customized copy so they can reflect their own interpretation of the
 * model and session rules.
 */
export const ICT_2022_TEMPLATE: TemplateDefinition = {
  id: 'ict-2022-model-v1',
  name: 'ICT 2022 Model',
  description: 'Track daily bias, liquidity, structure shift, entry area, and model execution.',
  photoCount: 3,
  fields: [
    { key: 'dailyBias', label: 'Daily bias', group: 'Context', type: 'enum', options: ['Bullish', 'Bearish', 'Neutral'], inTable: true, inStats: true },
    { key: 'targetLiquidity', label: 'Planned liquidity target', group: 'Context', type: 'enum', options: ['Buy-side liquidity', 'Sell-side liquidity', 'Previous day high / low', 'Equal highs / lows', 'Session high / low', 'Other'], inStats: true },
    { key: 'setupType', label: 'Setup type', group: 'Setup', type: 'enum', options: ['Reversal', 'Continuation'], inTable: true, inStats: true },
    { key: 'liquiditySweep', label: 'Liquidity swept before entry', group: 'Setup', type: 'enum', options: ['Buy-side', 'Sell-side', 'Both sides', 'No clear sweep'], inStats: true },
    { key: 'sweptReference', label: 'Swept liquidity reference', group: 'Setup', type: 'enum', options: ['Previous day high / low', 'Equal highs / lows', 'Session high / low', 'Swing high / low', 'Other'], inStats: true },
    { key: 'structureConfirmation', label: 'Structure confirmation', group: 'Entry model', type: 'enum', options: ['Bullish market structure shift', 'Bearish market structure shift', 'Displacement without clear shift', 'No confirmation'], inStats: true },
    { key: 'entryArea', label: 'Entry area', group: 'Entry model', type: 'enum', options: ['Fair value gap', 'Order block', 'Breaker / mitigation block', 'Other'], inTable: true, inStats: true },
    { key: 'entryTimeframe', label: 'Entry timeframe', group: 'Entry model', type: 'enum', options: ['1 minute', '2 minutes', '3 minutes', '5 minutes', '15 minutes', 'Other'], inStats: true },
    { key: 'session', label: 'Trading session', group: 'Context', type: 'enum', options: ['Asia', 'London', 'New York AM', 'New York PM', 'Other'], inTable: true, inStats: true },
    { key: 'followedModel', label: 'Followed the model', group: 'Review', type: 'enum', options: ['Yes', 'Partially', 'No'], inStats: true },
  ],
};
