import type { Db } from '../schema/types.ts';
import { currentAnswers, findDeltas } from '../answers/index.ts';

/**
 * Derived on the device, from local history, and never transmitted.
 *
 * It is the most personally revealing object in the product, which is
 * exactly why it has no server-side existence. Recomputed rather than
 * stored-and-updated, so it can never drift from the history it claims
 * to describe.
 */
export interface Flirtprint {
  answered: number;
  cardsRevised: number;
  /** Share of choices by trait, as whole percentages. Never raw counts. */
  traits: Record<string, number>;
  /** How much they have moved. Engine 4's visible surface. */
  changedMind: number;
  computedAt: string;
}

/** card_id -> trait. Supplied by the card library; the store has no opinion. */
export type TraitMap = Readonly<Record<string, string>>;

export function computeFlirtprint(db: Db, traits: TraitMap, now: string): Flirtprint {
  const current = currentAnswers(db);
  const deltas = findDeltas(db);

  const tally: Record<string, number> = {};
  for (const a of current) {
    const trait = traits[a.cardId];
    if (!trait) continue;
    tally[trait] = (tally[trait] ?? 0) + 1;
  }

  const total = Object.values(tally).reduce((s, n) => s + n, 0);
  const pct: Record<string, number> = {};
  for (const [trait, n] of Object.entries(tally)) {
    pct[trait] = total === 0 ? 0 : Math.round((n / total) * 100);
  }

  const revised = new Set(
    db.all<{ card_id: string }>(
      'SELECT DISTINCT card_id FROM answer_local WHERE revision_of IS NOT NULL',
    ).map((r) => r.card_id),
  );

  return {
    answered: current.length,
    cardsRevised: revised.size,
    traits: pct,
    changedMind: deltas.length,
    computedAt: now,
  };
}
