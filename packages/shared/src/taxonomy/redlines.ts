/**
 * The RED list (doc 04), plus the D7 disclosure category (doc 15 Part A).
 * A card or submission matching any of these does not ship, at any
 * entropy, in any band.
 */
export const REDLINES = [
  'IDENTIFIABLE_PERSON',
  'USER_IMAGE_UPLOAD',
  'FREE_TEXT_ABOUT_A_REAL_PERSON',
  'PRIVATE_CHANNEL',
  'PHYSICAL_APPEARANCE_OR_ATTRACTIVENESS',
  'SEXUAL_EXPERIENCE_OR_ACTIVITY',
  'SCHOOL_OR_HYPERLOCAL_GRANULARITY',
  'RANKING_OF_REAL_PEOPLE',
  'REQUIRES_DISCLOSURE_OF_HARM',
] as const;
export type Redline = (typeof REDLINES)[number];

/**
 * Input-level hints. A pre-publication gate, not a classifier.
 *
 * The naive form — any capitalised word — fires on the first word of
 * every sentence, which means it carries no signal and gets switched off.
 * This one only looks mid-sentence, and skips words that are ordinarily
 * capitalised there.
 */
const ALWAYS_CAPITALISED = new Set([
  'I', "I'm", "I'd", "I'll", "I've", 'OK', 'TV', 'US', 'UK',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
]);

/** Capitalised words that are not sentence-initial and not ordinary. */
export function properNounHints(text: string): string[] {
  const out: string[] = [];
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const words = sentence.trim().split(/\s+/);
    for (let i = 1; i < words.length; i++) {
      const w = (words[i] ?? '').replace(/[^A-Za-z']/g, '');
      if (w.length < 3) continue;
      if (ALWAYS_CAPITALISED.has(w)) continue;
      if (/^[A-Z][a-z]{2,}$/.test(w)) out.push(w);
    }
  }
  return out;
}

export const HANDLE_HINT = /[@#][A-Za-z0-9_]{2,}/;

/** Doc 04's second test, for anything the four-object rule lets through. */
export const OPERATIONAL_FILTER =
  'Would this screenshot look bad on a slide in a Senate hearing?';
