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
export const SCOPE_LABEL: Record<PublicationScope, string> = {
  B13_15: 'people your age',
  B16_17: 'people your age',
  B18_PLUS: 'people your age',
  GLOBAL_ONBOARDING: 'everyone on Peer Expression',
};
