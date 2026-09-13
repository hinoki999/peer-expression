import { createMockAdapter } from '@pe/api-client';
import type { Card, CardOption, PublishedStatistic } from '@pe/shared';

/**
 * Seed data for the shell. Not the card library — these exist so there is
 * something on screen before a backend exists, and so the spikes have a
 * realistic emoji load to measure.
 *
 * Every card here passes the four-object rule; none has a person as its
 * subject.
 */
const cards: Card[] = [
  {
    cardId: 'c-signal-eyes',
    subjectType: 'SYMBOL',
    frameId: 'f-what-does-it-mean',
    body: 'What does 👀 mean when someone sends it?',
    cohortBands: ['B16_17'],
    origin: 'TEAM',
    entropyScore: null,
    publishedAt: '2026-09-01T00:00:00.000Z',
    retiredAt: null,
  },
  {
    cardId: 'c-self-tiktok',
    subjectType: 'SELF',
    frameId: 'f-when-i-like-someone',
    body: 'When I like someone, I send them irrelevant TikToks instead of saying anything.',
    cohortBands: ['B16_17'],
    origin: 'TEAM',
    entropyScore: null,
    publishedAt: '2026-09-01T00:00:00.000Z',
    retiredAt: null,
  },
  {
    cardId: 'c-worse-delivered',
    subjectType: 'HYPOTHETICAL',
    frameId: 'f-whats-worse',
    body: "What's worse — left on delivered, or left on read?",
    cohortBands: ['B16_17'],
    origin: 'TEAM',
    entropyScore: null,
    publishedAt: '2026-09-01T00:00:00.000Z',
    retiredAt: null,
  },
];

const options: CardOption[] = [
  { optionId: 'o1', cardId: 'c-signal-eyes', label: 'flirting',  glyph: '😏', spokenForm: 'flirting', ordinal: 0 },
  { optionId: 'o2', cardId: 'c-signal-eyes', label: 'shocked',   glyph: '😳', spokenForm: 'shocked', ordinal: 1 },
  { optionId: 'o3', cardId: 'c-signal-eyes', label: 'look at this', glyph: '👇', spokenForm: 'look at this', ordinal: 2 },
  { optionId: 'o4', cardId: 'c-signal-eyes', label: 'nothing',   glyph: '🙃', spokenForm: 'nothing at all', ordinal: 3 },

  { optionId: 'o5', cardId: 'c-self-tiktok', label: 'constantly', glyph: '💀', spokenForm: 'constantly', ordinal: 0 },
  { optionId: 'o6', cardId: 'c-self-tiktok', label: 'sometimes',  glyph: '😭', spokenForm: 'sometimes', ordinal: 1 },
  { optionId: 'o7', cardId: 'c-self-tiktok', label: 'never',      glyph: '🧍', spokenForm: 'never', ordinal: 2 },

  { optionId: 'o8', cardId: 'c-worse-delivered', label: 'delivered', glyph: '📬', spokenForm: 'left on delivered', ordinal: 0 },
  { optionId: 'o9', cardId: 'c-worse-delivered', label: 'read',      glyph: '👁️', spokenForm: 'left on read', ordinal: 1 },
];

/**
 * Normalized display only — "about 3 in 10", never a sample size, a
 * numerator, or a decimal (I13). The third card has none, so the shell
 * shows the still-forming state too.
 */
const statistics: PublishedStatistic[] = [
  {
    cardId: 'c-signal-eyes',
    scopeShown: 'B16_17',
    normalizedDisplay: { o1: 47, o2: 12, o3: 33, o4: 8 },
    methodVersion: 'mock-1',
    publishedAt: '2026-09-12T00:00:00.000Z',
  },
  {
    cardId: 'c-self-tiktok',
    scopeShown: 'B16_17',
    normalizedDisplay: { o5: 41, o6: 38, o7: 21 },
    methodVersion: 'mock-1',
    publishedAt: '2026-09-12T00:00:00.000Z',
  },
];

export const api = createMockAdapter({
  drops: { '2026-09-13': { cards, options, statistics } },
  statistics,
  usage: { 'fmt-demo': 27 },
});

export const DEMO_DROP_DATE = '2026-09-13';
