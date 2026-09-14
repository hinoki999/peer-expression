import type { CardSubject } from '../taxonomy/subjects.ts';
import type { CohortBand, PublicationScope } from '../taxonomy/cohorts.ts';

/* ------------------------------------------------------------------ *
 * SERVER — holds counts. Never a vote row, never a vote timestamp,
 * never an account key on a vote. (doc 13 v2 section 2, invariant I2)
 * ------------------------------------------------------------------ */

export interface Account {
  accountId: string;          // random; not derived from anything identifying
  ageBand: CohortBand;
  attestStatus: 'PASS' | 'FAIL' | 'UNKNOWN';
  weightTier: number;         // recomputed from live evidence, never accumulated (I23)
  consentState: 'PENDING' | 'ACTIVE' | 'REVOKED' | 'ERASED';
  createdAt: string;
}

/** The vote store. A counter, not a row. */
export interface VoteCounterKey {
  cardId: string;
  scope: PublicationScope;
  choice: string;
  weightTier: number;
  dayBucket: string;          // YYYY-MM-DD — no per-vote timestamp
}

export interface Card {
  cardId: string;
  subjectType: CardSubject;
  frameId: string;
  body: string;
  /**
   * One line of voice after the number (doc 05 s3) — "apparently none of
   * us can function". Authored per card, never generated: it is the
   * product's personality and the most screenshot-bait element per pixel.
   *
   * Nullable because a card can ship without one, and a missing line must
   * degrade to silence rather than to a placeholder.
   */
  voiceLine: string | null;
  cohortBands: readonly CohortBand[];
  origin: 'TEAM' | 'MINTED';
  entropyScore: number | null;
  publishedAt: string | null;
  retiredAt: string | null;
}

export interface CardOption {
  optionId: string;
  cardId: string;
  label: string;
  glyph: string | null;
  spokenForm: string;         // authored; VoiceOver reads the meaning, not "eyes"
  ordinal: number;
}

export interface SignalObject {
  signalId: string;
  kind: 'EMOJI' | 'PHRASE' | 'TIMING' | 'BEHAVIOR' | 'FORMAT';
  glyph: string | null;
  label: string;
  semanticLabel: string;      // authored; accessibility is content work
  origin: 'AUTHORED' | 'RESEARCH' | 'MINTED';
  firstSeenAt: string;
}

/** The only server object holding expressive text, and the only attributable one. */
export interface Submission {
  submissionId: string;
  accountId: string;          // abuse response and takedown ONLY
  scope: PublicationScope;
  visibilityScope: 'SELF' | 'OTHERS';
  status: 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'WITHDRAWN';
}

/** The only statistic the app may read. Normalized; no n, no numerator. */
export interface PublishedStatistic {
  cardId: string;
  scopeShown: PublicationScope;
  normalizedDisplay: Record<string, number>;  // whole percentages only
  methodVersion: string;
  publishedAt: string;
}

/* ------------------------------------------------------------------ *
 * DEVICE — holds the personal history. Encrypted, never transmitted.
 * ------------------------------------------------------------------ */

export interface LocalAnswer {
  cardId: string;
  choice: string;
  answeredAt: string;
  latencyMs: number;
  dropPosition: number;
  revisionOf: string | null;  // append-only; revisions insert (I16)
}

/* ------------------------------------------------------------------ *
 * TRUST PATH — doc 21. No component sees both account and vote.
 * ------------------------------------------------------------------ */

export interface TrustAssertion {
  weightTier: number;
  cohortBand: CohortBand;     // SIGNED, never client-asserted (I30)
  policyVersion: string;
  issuedAt: string;
  expiresAt: string;          // <= evidence expiry (I23)
  keyBinding: string;         // distinct per vote (I28)
  signature: string;
  // deliberately absent: accountId, integrity evidence, card, choice
}
