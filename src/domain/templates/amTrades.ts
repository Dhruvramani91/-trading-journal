import type { TemplateDefinition } from '@/domain/models/trade';

/** AM Trades framework draft, built from the user's reviewed reference videos. */
export const AM_TRADES_TEMPLATE: TemplateDefinition = {
  id: 'am-trades-v1',
  name: 'AM Trades',
  description: 'Daily framework, profile confirmation, fractal entry, and review.',
  photoCount: 3,
  fields: [
    { key: 'relevantSwing', label: 'Relevant swing engaged', group: 'Daily framework', type: 'enum', options: ['Relevant daily high', 'Relevant daily low'], inTable: true, inStats: true },
    { key: 'swingReaction', label: 'Reaction at the swing', group: 'Daily framework', type: 'enum', options: ['Reversal', 'Continuation', 'No clear reaction'], inStats: true },
    { key: 'dailyBias', label: 'Daily bias', group: 'Daily framework', type: 'enum', options: ['Bullish', 'Bearish', 'Neutral'], inTable: true, inStats: true },
    { key: 'invalidation', label: 'Planned invalidation level', group: 'Daily framework', type: 'number' },
    { key: 'dailyProfile', label: 'Daily profile', group: 'Profile confirmation', type: 'enum', options: ['Asia reversal (18:00)', 'London reversal (01:00)', 'New York reversal (08:00)', 'Continuation day', 'Range / stand aside', 'Other'], inTable: true, inStats: true },
    { key: 'profileDirection', label: 'Profile direction', group: 'Profile confirmation', type: 'enum', options: ['Bullish', 'Bearish', 'Neutral'], inStats: true },
    { key: 'profileAlignment', label: 'Alignment with daily bias', group: 'Profile confirmation', type: 'enum', options: ['Aligned', 'Not aligned', 'Unclear'], inStats: true },
    { key: 'fractalPair', label: 'Fractal timeframe pair', group: 'Entry model', type: 'enum', options: ['7-hour → 15-minute', '1-hour → 5-minute', '30-minute → 3-minute', 'Other'], inTable: true, inStats: true },
    { key: 'entrySignature', label: 'Entry signature', group: 'Entry model', type: 'enum', options: ['Fractal model entry', 'IC-CISD', 'Protected swing continuation', 'Other'], inStats: true },
    { key: 'management', label: 'Management approach', group: 'Management & review', type: 'enum', options: ['Fixed target', 'Dynamic management', 'Scale out'], inStats: true },
    { key: 'pyramid', label: 'Added continuation / pyramid entry', group: 'Management & review', type: 'boolean', inStats: true },
    { key: 'followedModel', label: 'Followed the model', group: 'Management & review', type: 'enum', options: ['Yes', 'Partially', 'No'], inStats: true },
  ],
};
