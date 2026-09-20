import type { TemplateDefinition } from '@/domain/models/trade';

/**
 * Default trading journal template — the strategy shown in the reference screenshots.
 * Keys here are referenced by analytics & the journal table.
 * Introducing a new template later means adding a new file in this folder
 * and listing it in `domain/templates/registry.ts`.
 */
export const DEFAULT_TEMPLATE: TemplateDefinition = {
  id: 'default-ict-2026',
  name: 'Default ICT Journal',
  description: 'Daily/H4 context, alignment, confluence, and mistake tracking.',
  fields: [
    // ---------- Date / Day ----------
    {
      key: 'dayOfWeek',
      label: 'Day',
      group: 'Context',
      type: 'enum',
      options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      inTable: true,
      inStats: true,
      icon: 'Calendar',
    },

    // ---------- Higher-timeframe context ----------
    {
      key: 'dailyCandle',
      label: 'Daily Candle',
      group: 'Context',
      type: 'enum',
      options: ['Reversal [C2]', 'Continuation [C3]', 'Continuation [C4]'],
      inTable: true,
      inStats: true,
      icon: 'CandlestickChart',
    },
    {
      key: 'dailyProfile',
      label: 'Daily Profile',
      group: 'Context',
      type: 'enum',
      options: ['Classic Protraction', 'Delayed Protraction'],
      inTable: true,
      inStats: true,
      icon: 'TrendingUp',
    },
    {
      key: 'h4Candle',
      label: 'H4 Candle',
      group: 'Context',
      type: 'enum',
      options: ['18:00', '22:00', '02:00', '06:00', '10:00', '14:00'],
      inTable: true,
      inStats: true,
      icon: 'Clock',
    },
    {
      key: 'h4Profile',
      label: 'H4 Profile',
      group: 'Context',
      type: 'enum',
      options: ['Reversal [C2]', 'Continuation [C3]', 'Continuation [C4]'],
      inStats: true,
      icon: 'Activity',
    },
    {
      key: 'mtf',
      label: 'M90 / H1 / M30',
      group: 'Context',
      type: 'enum',
      options: ['Reversal [C2]', 'Continuation [C3]', 'Continuation [C4]'],
      inTable: true,
      inStats: true,
      icon: 'Layers',
    },

    // ---------- Setup ----------
    {
      key: 'entry',
      label: 'Entry',
      group: 'Setup',
      type: 'enum',
      options: ['1M CISD', '2M CISD', '3M CISD', '5M CISD'],
      inTable: true,
      inStats: true,
      icon: 'Crosshair',
    },
    {
      key: 'alignment',
      label: 'Alignment',
      group: 'Setup',
      type: 'enum',
      options: ['H4-30m', 'H4-1H', 'H6-M90'],
      inTable: true,
      inStats: true,
      icon: 'AlignVerticalSpaceAround',
    },
    {
      key: 'module',
      label: 'Module',
      group: 'Setup',
      type: 'enum',
      options: ['SMT-break (strenth switch)', 'SMT-break (Open-DOL- FTM )', 'OPEN OBJECTIVE'],
      inTable: true,
      inStats: true,
      icon: 'Puzzle',
    },
    {
      key: 'confluence',
      label: 'Confluence',
      group: 'Setup',
      type: 'enum',
      options: ['1 Stage', '2 Stage'],
      inTable: true,
      inStats: true,
      icon: 'GitMerge',
    },

    // ---------- Trade Type ----------
    {
      key: 'tradeType',
      label: 'Trade Type',
      group: 'Context',
      type: 'enum',
      options: ['Reversal', 'Continuation'],
      inTable: true,
      inStats: true,
      icon: 'ArrowLeftRight',
    },

    // ---------- Context flags ----------
    {
      key: 'quarterOpen',
      label: 'Quarter Open',
      group: 'Context',
      type: 'boolean',
      inTable: true,
      inStats: true,
      icon: 'Flag',
    },
    {
      key: 'driver',
      label: 'Driver',
      group: 'Context',
      type: 'boolean',
      inTable: true,
      inStats: true,
      icon: 'Zap',
    },

    // ---------- Mistakes / filters ----------
    {
      key: 'mistake',
      label: 'Mistake / Filter',
      group: 'Mistakes',
      type: 'enum',
      options: [
        'No mistake',
        'Early entry',
        'Late entry',
        'Counter-trend',
        'No plan',
        'Revenge trade',
        'Oversize',
        'Moved stop',
        'Exited early',
        'Held loser',
        'FOMO',
        'Other',
      ],
      inTable: true,
      inStats: true,
      icon: 'AlertTriangle',
    },
  ],
};
