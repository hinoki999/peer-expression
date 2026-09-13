import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryDb } from './helpers.mjs';
import {
  migrate, currentVersion, MIGRATIONS,
  recordAnswer, historyForCard, latestForCard, currentAnswers, findDeltas, wipe,
  computeFlirtprint,
  enqueue, ready, heldCount, releaseHeld, discardHeld, discardedCount, drain, alreadySent,
} from '../src/index.ts';

const at = (n) => new Date(Date.UTC(2026, 0, n, 12)).toISOString();
const answer = (o) => ({ latencyMs: 1200, dropPosition: 1, ...o });

function fresh() { const db = memoryDb(); migrate(db); return db; }

test('migrations apply in order and are idempotent', () => {
  const db = memoryDb();
  assert.equal(currentVersion(db), 0);
  assert.equal(migrate(db), MIGRATIONS.length);
  assert.equal(migrate(db), MIGRATIONS.length, 'second run is a no-op');
});

test('migrating twice does not lose history', () => {
  const db = fresh();
  recordAnswer(db, answer({ localId: 'a1', cardId: 'c1', choice: 'yes', answeredAt: at(1) }));
  migrate(db);
  assert.equal(historyForCard(db, 'c1').length, 1);
});

// ---- I16 : append-only, at runtime ----

test('I16 a revision inserts and never overwrites', () => {
  const db = fresh();
  recordAnswer(db, answer({ localId: 'a1', cardId: 'c1', choice: 'never', answeredAt: at(1) }));
  recordAnswer(db, answer({ localId: 'a2', cardId: 'c1', choice: 'always', answeredAt: at(15) }));

  const h = historyForCard(db, 'c1');
  assert.equal(h.length, 2, 'both answers survive');
  assert.equal(h[0].choice, 'never', 'the original is untouched');
  assert.equal(h[1].revisionOf, 'a1', 'the revision points at what it replaced');
  assert.equal(latestForCard(db, 'c1').choice, 'always');
});

test('I16 the module exposes no update path', async () => {
  const mod = await import('../src/answers/index.ts');
  const names = Object.keys(mod).join(' ').toLowerCase();
  for (const forbidden of ['update', 'overwrite', 'setanswer', 'edit']) {
    assert.ok(!names.includes(forbidden), `answers module must not export ${forbidden}`);
  }
});

test('currentAnswers returns one row per card, the newest', () => {
  const db = fresh();
  recordAnswer(db, answer({ localId: 'a1', cardId: 'c1', choice: 'x', answeredAt: at(1) }));
  recordAnswer(db, answer({ localId: 'a2', cardId: 'c1', choice: 'y', answeredAt: at(2) }));
  recordAnswer(db, answer({ localId: 'b1', cardId: 'c2', choice: 'z', answeredAt: at(1) }));
  const cur = currentAnswers(db).sort((a, b) => a.cardId.localeCompare(b.cardId));
  assert.deepEqual(cur.map((a) => [a.cardId, a.choice]), [['c1', 'y'], ['c2', 'z']]);
});

// ---- engine 4 ----

test('a delta is a real change of mind, not a repeat', () => {
  const db = fresh();
  recordAnswer(db, answer({ localId: 'a1', cardId: 'c1', choice: 'never', answeredAt: at(1) }));
  recordAnswer(db, answer({ localId: 'a2', cardId: 'c1', choice: 'always', answeredAt: at(15) }));
  recordAnswer(db, answer({ localId: 'b1', cardId: 'c2', choice: 'same', answeredAt: at(1) }));
  recordAnswer(db, answer({ localId: 'b2', cardId: 'c2', choice: 'same', answeredAt: at(15) }));

  const d = findDeltas(db);
  assert.equal(d.length, 1, 're-answering identically is not a change of mind');
  assert.equal(d[0].cardId, 'c1');
  assert.equal(d[0].from.choice, 'never');
  assert.equal(d[0].to.choice, 'always');
});

// ---- flirtprint ----

test('flirtprint derives from current answers and reports whole percentages', () => {
  const db = fresh();
  recordAnswer(db, answer({ localId: 'a', cardId: 'c1', choice: 'x', answeredAt: at(1) }));
  recordAnswer(db, answer({ localId: 'b', cardId: 'c2', choice: 'x', answeredAt: at(1) }));
  recordAnswer(db, answer({ localId: 'c', cardId: 'c3', choice: 'x', answeredAt: at(1) }));
  recordAnswer(db, answer({ localId: 'd', cardId: 'c4', choice: 'x', answeredAt: at(1) }));

  const fp = computeFlirtprint(db, { c1: 'direct', c2: 'direct', c3: 'direct', c4: 'avoidant' }, at(2));
  assert.equal(fp.answered, 4);
  assert.equal(fp.traits.direct, 75);
  assert.equal(fp.traits.avoidant, 25);
  for (const v of Object.values(fp.traits)) assert.equal(v, Math.round(v), 'no decimals');
});

test('flirtprint follows a revision rather than the original', () => {
  const db = fresh();
  recordAnswer(db, answer({ localId: 'a1', cardId: 'c1', choice: 'x', answeredAt: at(1) }));
  recordAnswer(db, answer({ localId: 'a2', cardId: 'c1', choice: 'y', answeredAt: at(20) }));
  const fp = computeFlirtprint(db, { c1: 'direct' }, at(21));
  assert.equal(fp.answered, 1, 'a revision is not a second answer');
  assert.equal(fp.cardsRevised, 1);
  assert.equal(fp.changedMind, 1);
});

test('flirtprint on an empty store does not divide by zero', () => {
  const fp = computeFlirtprint(fresh(), {}, at(1));
  assert.equal(fp.answered, 0);
  assert.deepEqual(fp.traits, {});
});

// ---- outbox : the pre-band hold ----

const vote = (id, cardId, extra = {}) => ({
  localId: id, kind: 'VOTE', cardId, payload: '{}', queuedAt: at(1), ...extra,
});

test('pre-band votes are held and released together', () => {
  const db = fresh();
  enqueue(db, vote('v1', 'c1'));
  enqueue(db, vote('v2', 'c2'));
  enqueue(db, vote('v3', 'c3', { queuedAt: at(2), bandState: 'RELEASED' }));

  assert.equal(ready(db).length, 1, 'only the banded vote may send');
  assert.equal(heldCount(db), 2);

  assert.equal(releaseHeld(db), 2, 'the band resolves and both are released');
  assert.equal(ready(db).length, 3);
  assert.equal(heldCount(db), 0);
});

test('draining removes only what was sent', () => {
  const db = fresh();
  enqueue(db, vote('v1', 'c1', { bandState: 'RELEASED' }));
  enqueue(db, vote('v2', 'c2', { queuedAt: at(2), bandState: 'RELEASED' }));
  drain(db, ['v1']);
  assert.deepEqual(ready(db).map((i) => i.localId), ['v2']);
});

// ---- I16 second half : a card contributes at most once ----

test('I16 a second vote for a card still queued is refused', () => {
  const db = fresh();
  assert.equal(enqueue(db, vote('v1', 'c1')), true);
  assert.equal(enqueue(db, vote('v2', 'c1')), false, 'the revision does not queue');
  assert.equal(heldCount(db), 1, 'and nothing was added behind it');
});

test('I16 a second vote after the drain is refused by the sent marker', () => {
  const db = fresh();
  enqueue(db, vote('v1', 'c1', { bandState: 'RELEASED' }));
  drain(db, ['v1']);
  assert.equal(ready(db).length, 0, 'the row is gone');
  assert.equal(alreadySent(db, 'c1'), true, 'but the contribution is remembered');
  assert.equal(enqueue(db, vote('v2', 'c1')), false, 'so a revision cannot double-count');
});

test('I16 the schema refuses a duplicate vote even without the guard', () => {
  const db = fresh();
  enqueue(db, vote('v1', 'c1'));
  assert.throws(
    () => db.run(
      `INSERT INTO outbox (local_id, kind, card_id, payload, queued_at, band_state)
       VALUES ('v2', 'VOTE', 'c1', '{}', ?, 'HELD')`,
      [at(2)],
    ),
    'the unique index is the backstop, not the caller',
  );
});

test('I16 revising a card still writes local history', () => {
  const db = fresh();
  recordAnswer(db, answer({ localId: 'a1', cardId: 'c1', choice: 'never', answeredAt: at(1) }));
  enqueue(db, vote('v1', 'c1', { bandState: 'RELEASED' }));
  drain(db, ['v1']);
  recordAnswer(db, answer({ localId: 'a2', cardId: 'c1', choice: 'always', answeredAt: at(15) }));

  assert.equal(historyForCard(db, 'c1').length, 2, 'the user may change their mind freely');
  assert.equal(enqueue(db, vote('v2', 'c1')), false, 'the counters just do not hear about it');
});

test('a submission is not a vote and is not deduplicated by card', () => {
  const db = fresh();
  assert.equal(enqueue(db, { localId: 's1', kind: 'SUBMISSION', payload: '{}', queuedAt: at(1) }), true);
  assert.equal(enqueue(db, { localId: 's2', kind: 'SUBMISSION', payload: '{}', queuedAt: at(2) }), true);
  assert.equal(heldCount(db), 2);
});

test('a vote without a cardId is a programming error, not a silent no-op', () => {
  const db = fresh();
  assert.throws(
    () => enqueue(db, { localId: 'v1', kind: 'VOTE', payload: '{}', queuedAt: at(1) }),
    /cardId/,
  );
});

// ---- doc 18 O1 : the band was declined or unavailable ----

test('O1 discarded votes never send, and a later release cannot revive them', () => {
  const db = fresh();
  enqueue(db, vote('v1', 'c1'));
  enqueue(db, vote('v2', 'c2'));

  assert.equal(discardHeld(db), 2);
  assert.equal(ready(db).length, 0, 'nothing contributes to the counters');
  assert.equal(heldCount(db), 0);

  assert.equal(releaseHeld(db), 0, 'release moves HELD only');
  assert.equal(ready(db).length, 0, 'DISCARDED is terminal');
  assert.equal(discardedCount(db), 2);
});

test('O1 the account stays usable locally after a discard', () => {
  const db = fresh();
  recordAnswer(db, answer({ localId: 'a1', cardId: 'c1', choice: 'x', answeredAt: at(1) }));
  enqueue(db, vote('v1', 'c1'));
  discardHeld(db);

  assert.equal(currentAnswers(db).length, 1, 'local history is untouched');
  assert.equal(computeFlirtprint(db, { c1: 'direct' }, at(2)).answered, 1);
});

test('O1 a discard does not mark the card as having contributed', () => {
  const db = fresh();
  enqueue(db, vote('v1', 'c1'));
  discardHeld(db);
  assert.equal(alreadySent(db, 'c1'), false, 'it never reached the counters');
});

test('the band state column refuses anything outside the three states', () => {
  const db = fresh();
  assert.throws(() => db.run(
    `INSERT INTO outbox (local_id, kind, card_id, payload, queued_at, band_state)
     VALUES ('v1', 'VOTE', 'c1', '{}', ?, 'MAYBE')`,
    [at(1)],
  ));
});

// ---- migration 2 : copy-then-swap keeps what was already queued ----

test('migration 2 preserves rows queued under version 1', () => {
  const db = memoryDb();
  assert.equal(migrate(db, 1), 1);
  db.run(
    "INSERT INTO outbox (local_id, kind, payload, queued_at, band_known) VALUES ('old1','VOTE','{\"a\":1}',?,1)",
    [at(1)],
  );
  db.run(
    "INSERT INTO outbox (local_id, kind, payload, queued_at, band_known) VALUES ('old2','VOTE','{}',?,0)",
    [at(2)],
  );

  migrate(db);

  const all = db.all('SELECT * FROM outbox ORDER BY local_id');
  assert.equal(all.length, 2, 'nothing was lost in the swap');
  assert.equal(all[0].payload, '{"a":1}', 'payloads survive');
  assert.equal(all[0].band_state, 'RELEASED', 'a known band becomes RELEASED');
  assert.equal(all[1].band_state, 'HELD', 'an unknown band stays held');
  assert.deepEqual(ready(db).map((i) => i.localId), ['old1']);
});

test('migration 2 leaves pre-existing rows without a card id', () => {
  const db = memoryDb();
  migrate(db, 1);
  db.run(
    "INSERT INTO outbox (local_id, kind, payload, queued_at, band_known) VALUES ('old1','VOTE','{}',?,1)",
    [at(1)],
  );
  migrate(db);
  assert.equal(ready(db)[0].cardId, null, 'version 1 did not record one, and it is not invented');
});

// ---- erasure ----

test('wipe leaves nothing behind', () => {
  const db = fresh();
  recordAnswer(db, answer({ localId: 'a1', cardId: 'c1', choice: 'x', answeredAt: at(1) }));
  enqueue(db, { localId: 'v1', kind: 'VOTE', cardId: 'c1', payload: '{}', queuedAt: at(1), bandState: 'RELEASED' });
  drain(db, ['v1']);
  wipe(db);
  assert.equal(currentAnswers(db).length, 0);
  assert.equal(ready(db).length, 0);
  assert.equal(computeFlirtprint(db, {}, at(2)).answered, 0);
  assert.equal(alreadySent(db, 'c1'), false, 'the sent markers go too');
});
