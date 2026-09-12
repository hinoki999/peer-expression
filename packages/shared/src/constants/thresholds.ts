/**
 * Privacy parameters. Invariant I22: these have hard floors that
 * configuration cannot cross, asserted in CI independently of the
 * runtime value. An invariant a config value can disable is not an
 * invariant.
 */

/** Doc 15 Part C. Server-side, tunable upward after adversarial validation. */
export const MIN_CELL_PUBLIC = 500;
export const MIN_CELL_PUBLIC_FLOOR = 500;

/** Doc 15 AMD 5. Publication gates on batch CONTENTS, never schedule. */
export const MIN_BATCH_DELTA = 20;
export const MIN_BATCH_DELTA_FLOOR = 20;

/** Doc 15 AMD 4. Sticky cohort fallback; never oscillates. */
export const FALLBACK_RELEASE_MULTIPLE = 1.5;

/** Doc 11 / doc 13 section 3. Coarse — a fine-grained weight is near-identifying. */
export const WEIGHT_TIERS = 3;

/** Doc 11 / doc 15. Adaptive by pool depth. */
export const DROP_TARGET = 12;
export const DROP_FLOOR = 8;

/** Doc 19 R3. A creator sees the milestone, never the exact count. */
export const USAGE_MILESTONES = [10, 25, 50, 100, 250, 500, 1000] as const;
