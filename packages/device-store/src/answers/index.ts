import type { Db } from '../schema/types.ts';

export interface LocalAnswer {
  localId: string;
  cardId: string;
  choice: string;
  answeredAt: string;
  latencyMs: number;
  dropPosition: number;
  revisionOf: string | null;
}

export interface RecordAnswerInput {
  localId: string;
  cardId: string;
  choice: string;
  answeredAt: string;
  latencyMs: number;
  dropPosition: number;
}

/**
 * Append-only (invariant I16).
 *
 * There is no update path and there is deliberately no way to add one
 * through this module. Answering a card a second time inserts a new row
 * pointing at the previous one, so the history is the whole record of
 * what someone thought and when they changed their mind.
 *
 * Self-delta reads that history. An overwritten answer would silently
 * destroy the only engine in the product that compounds with time — and
 * there is no server copy, so it would be unrecoverable.
 */
export function recordAnswer(db: Db, input: RecordAnswerInput): LocalAnswer {
  const prior = latestForCard(db, input.cardId);
  const row: LocalAnswer = { ...input, revisionOf: prior?.localId ?? null };
  db.run(
    `INSERT INTO answer_local
       (local_id, card_id, choice, answered_at, latency_ms, drop_position, revision_of)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [row.localId, row.cardId, row.choice, row.answeredAt,
     row.latencyMs, row.dropPosition, row.revisionOf],
  );
  return row;
}

function toAnswer(r: Record<string, unknown>): LocalAnswer {
  return {
    localId: String(r['local_id']),
    cardId: String(r['card_id']),
    choice: String(r['choice']),
    answeredAt: String(r['answered_at']),
    latencyMs: Number(r['latency_ms']),
    dropPosition: Number(r['drop_position']),
    revisionOf: r['revision_of'] == null ? null : String(r['revision_of']),
  };
}

/** Every answer ever given for a card, oldest first. The revision chain. */
export function historyForCard(db: Db, cardId: string): LocalAnswer[] {
  return db
    .all('SELECT * FROM answer_local WHERE card_id = ? ORDER BY answered_at ASC', [cardId])
    .map(toAnswer);
}

/** What they think now. */
export function latestForCard(db: Db, cardId: string): LocalAnswer | null {
  const r = db.get(
    'SELECT * FROM answer_local WHERE card_id = ? ORDER BY answered_at DESC LIMIT 1',
    [cardId],
  );
  return r ? toAnswer(r) : null;
}

/** The current answer to every card answered at least once. */
export function currentAnswers(db: Db): LocalAnswer[] {
  return db
    .all(
      `SELECT a.* FROM answer_local a
       JOIN (SELECT card_id, MAX(answered_at) AS t FROM answer_local GROUP BY card_id) m
         ON a.card_id = m.card_id AND a.answered_at = m.t`,
    )
    .map(toAnswer);
}

export interface Delta {
  cardId: string;
  from: LocalAnswer;
  to: LocalAnswer;
}

/**
 * Cards where the answer actually changed. Engine 4's raw material.
 * A revision that repeats the same choice is not a delta — re-answering
 * identically is a confirmation, and surfacing it as a change would be a
 * lie about the user.
 */
export function findDeltas(db: Db): Delta[] {
  const out: Delta[] = [];
  const cards = db.all<{ card_id: string }>('SELECT DISTINCT card_id FROM answer_local');
  for (const { card_id } of cards) {
    const h = historyForCard(db, card_id);
    if (h.length < 2) continue;
    const first = h[0];
    const last = h[h.length - 1];
    if (!first || !last || first.choice === last.choice) continue;
    out.push({ cardId: card_id, from: first, to: last });
  }
  return out;
}

/** Erasure. Local history, and therefore the Flirtprint, simply ceases. */
export function wipe(db: Db): void {
  db.exec('DELETE FROM answer_local; DELETE FROM delta_shown; DELETE FROM outbox; DELETE FROM streak;');
}
