/**
 * The four-object rule (doc 04). Invariant I1.
 * Every card's subject is one of these. Never a person.
 * Single definition — imported by app, moderation tool, classifier and seeds.
 */
export const CARD_SUBJECTS = ['SELF', 'SYMBOL', 'HYPOTHETICAL', 'AGGREGATE'] as const;
export type CardSubject = (typeof CARD_SUBJECTS)[number];

export function isCardSubject(v: unknown): v is CardSubject {
  return typeof v === 'string' && (CARD_SUBJECTS as readonly string[]).includes(v);
}

export const SUBJECT_DEFINITION: Record<CardSubject, string> = {
  SELF: "the author's own behaviour",
  SYMBOL: 'an emoji, phrase, timing or format',
  HYPOTHETICAL: 'an invented scenario; nobody real',
  AGGREGATE: 'what the cohort already said',
};
