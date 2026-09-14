/**
 * Age bands (doc 03 D1b). Bands never mix.
 * The band is carried in the signed TrustAssertion and is never
 * accepted from the client (doc 21 T3, invariant I30).
 */
export const COHORT_BANDS = ['B13_15', 'B16_17', 'B18_PLUS'] as const;
export type CohortBand = (typeof COHORT_BANDS)[number];

/** The one cross-band scope. Never presented as peer data (I26). */
export const GLOBAL_SCOPE = 'GLOBAL_ONBOARDING' as const;
export type PublicationScope = CohortBand | typeof GLOBAL_SCOPE;

/** Launch order — density arrives soonest at 16-17 (doc 13 v2 section 4). */
export const LAUNCH_BAND_ORDER: readonly CohortBand[] = ['B16_17', 'B13_15', 'B18_PLUS'];

export function isCohortBand(v: unknown): v is CohortBand {
  return typeof v === 'string' && (COHORT_BANDS as readonly string[]).includes(v);
}

/** Copy rule for I26: a cross-band figure is never "people your age". */
/**
 * What a published statistic is called on screen.
 *
 * Doc 03, product language, 2026-09-14: never describe a cell as
 * "16-17-year-olds", and — the part that caught us — never imply
 * chronological age at all. "People your age" was the previous wording
 * and it asserts precisely the thing we cannot claim.
 *
 * We measure a platform-DECLARED range. Cells are mixed at both
 * boundaries by declaration lag: a user who turned 16 can still report
 * B13_15 for up to a declaration year, and a user who turned 18 can still
 * sit inside B16_17 (doc 33, CL1's residual). Calling that group "people
 * your age" is a claim about ground truth that the age signal does not
 * support.
 *
 * The rule reaches Discover copy, the share card, onboarding, support
 * macros and anything shown to a regulator — so the label lives here,
 * once, rather than being retyped per screen.
 */
export const SCOPE_LABEL: Record<PublicationScope, string> = {
  B13_15: 'your age-range group',
  B16_17: 'your age-range group',
  B18_PLUS: 'your age-range group',
  GLOBAL_ONBOARDING: 'everyone on Peer Expression',
};
