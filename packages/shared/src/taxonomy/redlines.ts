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

/** Input-level hints. A pre-publication gate, not a classifier. */
export const PROPER_NOUN_HINT = /\b[A-Z][a-z]{2,}\b/;
export const HANDLE_HINT = /[@#][A-Za-z0-9_]{2,}/;

/** Doc 04's second test, for anything the four-object rule lets through. */
export const OPERATIONAL_FILTER =
  'Would this screenshot look bad on a slide in a Senate hearing?';
