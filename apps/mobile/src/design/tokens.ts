/**
 * Design tokens. Doc 05 section 4: dark ground, type as hero, emoji as
 * content, motion as reward, and no faces or photos anywhere.
 *
 * Single dark theme — no light mode at launch. Values here are a starting
 * point to tune on a device, not measured decisions.
 */
export const color = {
  ground: '#0B0D10',
  surface: '#14181D',
  line: '#222A31',
  ink: '#E8EEF2',
  dim: '#93A3AF',
  faint: '#5F707D',
  /** The user's own choice in the reveal. Reads as "you", not as brand. */
  self: '#6FC3E8',
  bar: '#2B343C',
  /** The self bar. Darker than `self` so the label stays legible on it. */
  barSelf: '#1E3A47',
} as const;

export const space = [0, 4, 8, 12, 16, 24, 32, 48] as const;

export const radius = { none: 0, sm: 6, pill: 999 } as const;

export const type = {
  question: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  option: { fontSize: 19, lineHeight: 24, fontWeight: '600' },
  glyph: { fontSize: 40, lineHeight: 48 },
  value: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  voice: { fontSize: 15, lineHeight: 21 },
  label: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2 },
} as const;

/** Named so the choreography spec can reference them directly. */
export const motion = {
  lock: { duration: 60 },
  bars: { duration: 420 },
  settle: { duration: 180 },
  advance: { duration: 260 },
} as const;

/** Beats from the reveal sequence, in ms from the tap. */
export const beat = {
  lock: 60,
  bars: 180,
  value: 320,
  reveal: 420,
  voice: 560,
  advance: 1400,
} as const;
