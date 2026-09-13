import type { Db } from '../schema/types.ts';

export interface OutboxItem {
  localId: string;
  kind: 'VOTE' | 'SUBMISSION';
  payload: string;
  queuedAt: string;
  bandKnown: boolean;
}

/**
 * Votes queue here and flush on reconnect, so a whole drop works offline.
 *
 * `bandKnown` is the pre-band hold: answers given before the age band
 * resolves stay here and are only released once it does. Without it, a
 * user's first answers either land in the wrong cohort permanently or are
 * silently dropped — and since the band is carried in a signed assertion,
 * an unbanded vote cannot be accepted anyway.
 */
export function enqueue(db: Db, item: OutboxItem): void {
  db.run(
    `INSERT INTO outbox (local_id, kind, payload, queued_at, band_known)
     VALUES (?, ?, ?, ?, ?)`,
    [item.localId, item.kind, item.payload, item.queuedAt, item.bandKnown ? 1 : 0],
  );
}

/** Only items whose band is resolved are eligible to send. */
export function ready(db: Db): OutboxItem[] {
  return db
    .all('SELECT * FROM outbox WHERE band_known = 1 ORDER BY queued_at ASC')
    .map((r) => ({
      localId: String(r['local_id']),
      kind: String(r['kind']) as OutboxItem['kind'],
      payload: String(r['payload']),
      queuedAt: String(r['queued_at']),
      bandKnown: Number(r['band_known']) === 1,
    }));
}

export function pendingBand(db: Db): number {
  const r = db.get<{ n: number }>('SELECT COUNT(*) AS n FROM outbox WHERE band_known = 0');
  return r?.n ?? 0;
}

/** Called once the platform returns a band — releases everything held. */
export function releaseHeld(db: Db): number {
  const held = pendingBand(db);
  db.run('UPDATE outbox SET band_known = 1 WHERE band_known = 0');
  return held;
}

export function drain(db: Db, ids: readonly string[]): void {
  if (ids.length === 0) return;
  db.run(
    `DELETE FROM outbox WHERE local_id IN (${ids.map(() => '?').join(',')})`,
    ids,
  );
}
