import type { Db } from '../schema/types.ts';

/** Terminal once it leaves HELD. RELEASED and DISCARDED never swap. */
export type BandState = 'HELD' | 'RELEASED' | 'DISCARDED';

export interface OutboxItem {
  localId: string;
  kind: 'VOTE' | 'SUBMISSION';
  /** Required for VOTE. The schema enforces one queued vote per card. */
  cardId: string | null;
  payload: string;
  queuedAt: string;
  bandState: BandState;
}

export interface EnqueueInput {
  localId: string;
  kind: 'VOTE' | 'SUBMISSION';
  cardId?: string | null;
  payload: string;
  queuedAt: string;
  bandState?: BandState;
}

function toItem(r: Record<string, unknown>): OutboxItem {
  return {
    localId: String(r['local_id']),
    kind: String(r['kind']) as OutboxItem['kind'],
    cardId: r['card_id'] == null ? null : String(r['card_id']),
    payload: String(r['payload']),
    queuedAt: String(r['queued_at']),
    bandState: String(r['band_state']) as BandState,
  };
}

/** Has this card already contributed to the counters? */
export function alreadySent(db: Db, cardId: string): boolean {
  return db.get('SELECT 1 FROM vote_sent WHERE card_id = ?', [cardId]) !== undefined;
}

function voteQueued(db: Db, cardId: string): boolean {
  return db.get(
    "SELECT 1 FROM outbox WHERE kind = 'VOTE' AND card_id = ?", [cardId],
  ) !== undefined;
}

/**
 * Queue an item. Returns false when nothing was queued.
 *
 * **A card contributes to the counters at most once** (I16, second half).
 * Local history is append-only and a user may revise freely, but a
 * revision must never produce a second aggregate contribution — that
 * would double-count them.
 *
 * Enforced three ways, so it does not depend on the caller remembering:
 * this guard, a unique index on (card_id) where kind = 'VOTE', and the
 * `vote_sent` marker that outlives the drain.
 */
export function enqueue(db: Db, input: EnqueueInput): boolean {
  const cardId = input.cardId ?? null;

  if (input.kind === 'VOTE') {
    if (!cardId) throw new Error('outbox: a VOTE must carry a cardId');
    if (alreadySent(db, cardId)) return false;
    if (voteQueued(db, cardId)) return false;
  }

  db.run(
    `INSERT INTO outbox (local_id, kind, card_id, payload, queued_at, band_state)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.localId, input.kind, cardId, input.payload, input.queuedAt,
     input.bandState ?? 'HELD'],
  );
  return true;
}

/** Only RELEASED items may be sent. HELD is pre-band; DISCARDED never sends. */
export function ready(db: Db): OutboxItem[] {
  return db
    .all("SELECT * FROM outbox WHERE band_state = 'RELEASED' ORDER BY queued_at ASC")
    .map(toItem);
}

export function heldCount(db: Db): number {
  const r = db.get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM outbox WHERE band_state = 'HELD'",
  );
  return r?.n ?? 0;
}

export function discardedCount(db: Db): number {
  const r = db.get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM outbox WHERE band_state = 'DISCARDED'",
  );
  return r?.n ?? 0;
}

/**
 * The platform returned a band. Everything held becomes sendable.
 * Only HELD moves — a DISCARDED item can never be revived by a later
 * call, which is what makes the unsafe transition unrepresentable rather
 * than merely uncalled.
 */
export function releaseHeld(db: Db): number {
  const n = heldCount(db);
  db.run("UPDATE outbox SET band_state = 'RELEASED' WHERE band_state = 'HELD'");
  return n;
}

/**
 * The platform returned unavailable, or the user declined.
 *
 * Doc 18 O1: the account stays usable locally, its answers stay in local
 * history, and it contributes nothing to age-band counters or published
 * statistics. Terminal — `releaseHeld` cannot undo it.
 */
export function discardHeld(db: Db): number {
  const n = heldCount(db);
  db.run("UPDATE outbox SET band_state = 'DISCARDED' WHERE band_state = 'HELD'");
  return n;
}

/**
 * Remove sent items and record that their cards contributed.
 *
 * The marker is the point: deleting the row would otherwise erase the
 * only evidence a card was ever sent, and a revision afterwards would
 * enqueue a second vote for it.
 */
export function drain(db: Db, ids: readonly string[]): void {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  const rows = db.all(
    `SELECT card_id FROM outbox WHERE local_id IN (${placeholders}) AND kind = 'VOTE'`,
    ids,
  );
  const sentAt = new Date().toISOString();
  for (const r of rows) {
    if (r['card_id'] == null) continue;
    db.run(
      'INSERT INTO vote_sent (card_id, sent_at) VALUES (?, ?) ON CONFLICT(card_id) DO NOTHING',
      [String(r['card_id']), sentAt],
    );
  }
  db.run(`DELETE FROM outbox WHERE local_id IN (${placeholders})`, ids);
}
