import type { Db, Migration } from '../schema/types.ts';

/**
 * Forward-only. Numbered. Never edited once shipped — a migration that has
 * run on someone's phone is history, and changing it means two devices
 * disagree about what version 3 was.
 *
 * Copy-then-swap for anything destructive: build the new table, copy rows
 * in, swap names. A failed migration must not lose a user's history,
 * because there is no server copy to restore from.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial',
    up: `
      CREATE TABLE IF NOT EXISTS answer_local (
        local_id      TEXT PRIMARY KEY,
        card_id       TEXT NOT NULL,
        choice        TEXT NOT NULL,
        answered_at   TEXT NOT NULL,
        latency_ms    INTEGER NOT NULL,
        drop_position INTEGER NOT NULL,
        revision_of   TEXT REFERENCES answer_local(local_id)
      );
      CREATE INDEX IF NOT EXISTS idx_answer_card ON answer_local(card_id);
      CREATE INDEX IF NOT EXISTS idx_answer_time ON answer_local(answered_at);

      CREATE TABLE IF NOT EXISTS delta_shown (
        local_id      TEXT PRIMARY KEY,
        card_id       TEXT NOT NULL,
        old_answer_id TEXT NOT NULL,
        new_answer_id TEXT NOT NULL,
        shown_at      TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS outbox (
        local_id   TEXT PRIMARY KEY,
        kind       TEXT NOT NULL,
        payload    TEXT NOT NULL,
        queued_at  TEXT NOT NULL,
        band_known INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_outbox_ready ON outbox(band_known, queued_at);

      CREATE TABLE IF NOT EXISTS streak (
        id          INTEGER PRIMARY KEY CHECK (id = 1),
        current     INTEGER NOT NULL DEFAULT 0,
        longest     INTEGER NOT NULL DEFAULT 0,
        last_drop   TEXT
      );
    `,
  },
  {
    version: 2,
    name: 'outbox-one-vote-per-card',
    up: `
      -- Copy-then-swap. The outbox gains card_id and a three-state band
      -- column, and neither can be added in place without losing the
      -- CHECK constraint. A failed migration must not lose a user's
      -- history, so the old table is only dropped once the new one is
      -- populated.
      CREATE TABLE outbox_v2 (
        local_id   TEXT PRIMARY KEY,
        kind       TEXT NOT NULL,
        card_id    TEXT,
        payload    TEXT NOT NULL,
        queued_at  TEXT NOT NULL,
        band_state TEXT NOT NULL DEFAULT 'HELD'
                   CHECK (band_state IN ('HELD','RELEASED','DISCARDED'))
      );

      INSERT INTO outbox_v2 (local_id, kind, card_id, payload, queued_at, band_state)
        SELECT local_id, kind, NULL, payload, queued_at,
               CASE WHEN band_known = 1 THEN 'RELEASED' ELSE 'HELD' END
        FROM outbox;

      DROP TABLE outbox;
      ALTER TABLE outbox_v2 RENAME TO outbox;

      CREATE INDEX IF NOT EXISTS idx_outbox_ready ON outbox(band_state, queued_at);
      -- One queued vote per card, enforced by the schema rather than by
      -- the caller remembering.
      CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_one_vote
        ON outbox(card_id) WHERE kind = 'VOTE' AND card_id IS NOT NULL;

      -- Survives the drain. Without it, deleting a sent row erases the
      -- only evidence that a card already contributed, and a later
      -- revision enqueues a second vote for the same card.
      CREATE TABLE IF NOT EXISTS vote_sent (
        card_id TEXT PRIMARY KEY,
        sent_at TEXT NOT NULL
      );
    `,
  },
];

const SCHEMA_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_version (
    id      INTEGER PRIMARY KEY CHECK (id = 1),
    version INTEGER NOT NULL
  );
`;

export function currentVersion(db: Db): number {
  db.exec(SCHEMA_TABLE);
  const row = db.get<{ version: number }>('SELECT version FROM schema_version WHERE id = 1');
  return row?.version ?? 0;
}

/**
 * Runs pending migrations in order. Each one is applied and recorded
 * together — a migration that runs without its version being recorded
 * would re-run on next launch.
 */
export function migrate(db: Db, to = MIGRATIONS.length): number {
  let version = currentVersion(db);
  for (const m of MIGRATIONS) {
    if (m.version <= version || m.version > to) continue;
    db.exec(m.up);
    db.run(
      'INSERT INTO schema_version (id, version) VALUES (1, ?) ' +
        'ON CONFLICT(id) DO UPDATE SET version = excluded.version',
      [m.version],
    );
    version = m.version;
  }
  return version;
}
