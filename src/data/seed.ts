import type { Trade } from '@/domain/models/trade';
import { ACTIVE_TEMPLATE_ID } from '@/domain/templates/registry';

function makeSvgPhoto(
  label: string,
  direction: 'bull' | 'bear',
  color: string,
): string {
  const bars = direction === 'bull'
    ? [
        { x: 10, y: 80, h: 20, c: '#9A9AA6' },
        { x: 25, y: 70, h: 30, c: '#9A9AA6' },
        { x: 40, y: 55, h: 45, c: '#39bd9a' },
        { x: 55, y: 40, h: 60, c: '#39bd9a' },
        { x: 70, y: 25, h: 75, c: '#39bd9a' },
        { x: 85, y: 15, h: 85, c: '#39bd9a' },
      ]
    : [
        { x: 10, y: 10, h: 90, c: '#9A9AA6' },
        { x: 25, y: 20, h: 80, c: '#9A9AA6' },
        { x: 40, y: 35, h: 65, c: '#d95d65' },
        { x: 55, y: 50, h: 50, c: '#d95d65' },
        { x: 70, y: 65, h: 35, c: '#d95d65' },
        { x: 85, y: 75, h: 25, c: '#d95d65' },
      ];

  const rectsSvg = bars
    .map(
      (b) =>
        `<rect x="${b.x}" y="${100 - b.y - b.h / 2}" width="12" height="${Math.max(b.h / 2, 4)}" rx="2" fill="${b.c}" opacity="0.85"/>`,
    )
    .join('');

  const dirLabel = direction === 'bull' ? 'LONG' : 'SHORT';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="#ffffff"/><rect width="320" height="180" fill="none" stroke="#eef0f1" stroke-width="1"/><line x1="0" y1="60" x2="320" y2="60" stroke="#f4f5f7" stroke-width="1"/><line x1="0" y1="90" x2="320" y2="90" stroke="#f4f5f7" stroke-width="1"/><line x1="0" y1="120" x2="320" y2="120" stroke="#f4f5f7" stroke-width="1"/><g transform="scale(2.8,1.5) translate(0,4)">${rectsSvg}</g><polyline points="${direction === 'bull' ? '20,150 60,130 100,110 140,85 180,60 220,42 260,28 300,18' : '20,18 60,30 100,50 140,75 180,95 220,115 260,135 300,155'}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><text x="10" y="16" font-family="monospace" font-size="10" font-weight="bold" fill="#64748b">${label}</text><text x="265" y="16" font-family="monospace" font-size="10" font-weight="bold" fill="${color}">${dirLabel}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const HTF_BULL = makeSvgPhoto('HTF · Daily', 'bull', '#39bd9a');
const ITF_BULL = makeSvgPhoto('ITF · H4', 'bull', '#9143d0');
const LTF_BULL = makeSvgPhoto('LTF · M90', 'bull', '#64748b');
const HTF_BEAR = makeSvgPhoto('HTF · Daily', 'bear', '#d95d65');
const ITF_BEAR = makeSvgPhoto('ITF · H4', 'bear', '#9143d0');
const LTF_BEAR = makeSvgPhoto('LTF · M90', 'bear', '#64748b');

export const SEED_TRADES: Trade[] = [
  {
    id: 'seed-01',
    templateId: ACTIVE_TEMPLATE_ID,
    number: 1,
    openedAt: '2026-02-02T13:15:00.000Z',
    closedAt: '2026-02-02T13:43:00.000Z',
    instrument: 'RB',
    direction: 'short',
    result: 'win',
    r: 1,
    plannedRR: 3,
    durationMin: 28,
    templateData: {
      dayOfWeek: 'Monday',
      dailyCandle: 'Reversal [C2]',
      dailyProfile: 'Classic Protraction',
      h4Candle: '6AM',
      h4Profile: 'Expansion [C2]',
      mtf: 'Expansion [C2]',
      entry: '3M CISD',
      alignment: 'H4-1H',
      module: 'SS trigger',
      confluence: '2 Stage',
      quarterOpen: false,
      driver: false,
      mistake: 'No mistake',
    },
    notes: 'Clean A+ setup, respected the daily range and entered on the 3M CISD fill.',
    photos: { htf: HTF_BEAR, itf: ITF_BEAR, ltf: LTF_BEAR },
    createdAt: '2026-02-02T13:43:00.000Z',
    updatedAt: '2026-02-02T13:43:00.000Z',
  },
  {
    id: 'seed-02',
    templateId: ACTIVE_TEMPLATE_ID,
    number: 2,
    openedAt: '2026-03-03T14:30:00.000Z',
    closedAt: '2026-03-03T15:08:00.000Z',
    instrument: 'YM',
    direction: 'long',
    result: 'loss',
    r: -1,
    plannedRR: 2,
    durationMin: 38,
    templateData: {
      dayOfWeek: 'Tuesday',
      dailyCandle: 'Continuation [C3]',
      dailyProfile: 'Delayed Protraction',
      h4Candle: '10AM',
      h4Profile: 'Expansion [C2]',
      mtf: 'Expansion [C2]',
      entry: '3M CISD',
      alignment: 'H4-30m',
      module: 'SS trigger',
      confluence: '2 Stage',
      quarterOpen: false,
      driver: false,
      mistake: 'Early entry',
    },
    notes: 'Entered before the displacement candle closed — should have waited for confirmation.',
    photos: { htf: HTF_BULL, itf: ITF_BULL, ltf: LTF_BULL },
    createdAt: '2026-03-03T15:08:00.000Z',
    updatedAt: '2026-03-03T15:08:00.000Z',
  },
  {
    id: 'seed-03',
    templateId: ACTIVE_TEMPLATE_ID,
    number: 3,
    openedAt: '2026-03-05T13:40:00.000Z',
    closedAt: '2026-03-05T14:02:00.000Z',
    instrument: 'YM',
    direction: 'short',
    result: 'be',
    r: 0,
    plannedRR: 2,
    durationMin: 22,
    templateData: {
      dayOfWeek: 'Thursday',
      dailyCandle: 'Reversal [C2]',
      dailyProfile: 'Classic Protraction',
      h4Candle: '10AM',
      h4Profile: 'Continuation [C3]',
      mtf: 'Continuation [C3]',
      entry: '2M CISD',
      alignment: 'H4-1H',
      module: 'SS trigger',
      confluence: '1 Stage',
      quarterOpen: false,
      driver: false,
      mistake: 'No mistake',
    },
    notes: 'Stopped at BE after price stalled at the 10AM level.',
    photos: { htf: HTF_BEAR, itf: ITF_BEAR, ltf: LTF_BEAR },
    createdAt: '2026-03-05T14:02:00.000Z',
    updatedAt: '2026-03-05T14:02:00.000Z',
  },
  {
    id: 'seed-04',
    templateId: ACTIVE_TEMPLATE_ID,
    number: 4,
    openedAt: '2026-03-09T13:10:00.000Z',
    closedAt: '2026-03-09T15:40:00.000Z',
    instrument: 'ES',
    direction: 'long',
    result: 'win',
    r: 2,
    plannedRR: 3,
    durationMin: 150,
    templateData: {
      dayOfWeek: 'Monday',
      dailyCandle: 'Continuation [C3]',
      dailyProfile: 'Delayed Protraction',
      h4Candle: '10AM',
      h4Profile: 'Continuation [C3]',
      mtf: 'Continuation [C3]',
      entry: '5M CISD',
      alignment: 'H4-1H',
      module: 'Open Objective',
      confluence: '2 Stage',
      quarterOpen: false,
      driver: false,
      mistake: 'No mistake',
    },
    notes: 'Open Objective hit cleanly. Scaled 1R out, runner to 2R.',
    photos: { htf: HTF_BULL, itf: ITF_BULL, ltf: LTF_BULL },
    createdAt: '2026-03-09T15:40:00.000Z',
    updatedAt: '2026-03-09T15:40:00.000Z',
  },
  {
    id: 'seed-05',
    templateId: ACTIVE_TEMPLATE_ID,
    number: 5,
    openedAt: '2026-03-16T13:00:00.000Z',
    closedAt: '2026-03-16T13:18:00.000Z',
    instrument: 'ES',
    direction: 'short',
    result: 'win',
    r: 2,
    plannedRR: 2,
    durationMin: 18,
    templateData: {
      dayOfWeek: 'Monday',
      dailyCandle: 'Reversal [C2]',
      dailyProfile: 'Classic Protraction',
      h4Candle: '10AM',
      h4Profile: 'Continuation [C3]',
      mtf: 'Expansion [C2]',
      entry: '3M CISD',
      alignment: 'H4-30m',
      module: 'Open Objective',
      confluence: '1 Stage',
      quarterOpen: false,
      driver: false,
      mistake: 'No mistake',
    },
    notes: 'Quick 2R reversal off the 10AM high after a failed continuation.',
    photos: { htf: HTF_BEAR, itf: ITF_BEAR, ltf: LTF_BEAR },
    createdAt: '2026-03-16T13:18:00.000Z',
    updatedAt: '2026-03-16T13:18:00.000Z',
  },
];
