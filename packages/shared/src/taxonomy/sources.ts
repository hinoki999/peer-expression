/**
 * Every place a card can come from. Doc 33 CL6.
 *
 * The problem this fixes was live: the content gate reported "no
 * db/seed/cards directory yet — nothing to check" and passed, while the
 * cards that actually rendered in the app sat in the app package, which
 * it never opened. CI was truthfully reporting a clean result about an
 * empty set, which is worse than a red build because it reads as safety.
 *
 * A registry rather than paths hardcoded in the gate, so that adding a
 * card universe without adding it here is a visible omission in a
 * reviewed file — and so that deleting a path fails the build instead of
 * quietly shrinking what gets scanned.
 *
 * What this cannot assert is that the list is COMPLETE. Nothing can prove
 * a fourth card universe does not exist somewhere unregistered. Doc 33
 * names the destination: one authoritative card schema in this package
 * that both seed cards and mocks instantiate, so a card that did not go
 * through the validated constructor is not a card, and coverage becomes a
 * property of the type instead of a list someone has to maintain. The
 * registry is the interim step; the schema waits for the card model to
 * settle.
 */
export interface CardSource {
  /** Repo-relative. A directory of JSON seeds, or a single module. */
  readonly path: string;
  readonly kind: 'seed-directory' | 'module';
  /** Why it is user-reachable — the reason it must be scanned. */
  readonly why: string;
  /** Absent until the directory exists; the gate must not fail on it. */
  readonly optional?: boolean;
}

export const CARD_LIBRARY_SOURCES: readonly CardSource[] = [
  {
    path: 'db/seed/cards',
    kind: 'seed-directory',
    why: 'the authored library — every card served to a real user',
    // Nothing has been authored yet. Marked optional so its absence is a
    // stated fact rather than a broken build, and so CL6 still bites on
    // every other source.
    optional: true,
  },
  {
    path: 'apps/mobile/src/state/mock.ts',
    kind: 'module',
    why: 'renders on a device today through the mock adapter, so it is user-reachable',
  },
];
