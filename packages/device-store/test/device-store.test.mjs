import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryDb } from './helpers.mjs';
import {
  migrate, currentVersion, MIGRATIONS,
  recordAnswer, historyForCard, latestForCard, currentAnswers, findDeltas, wipe,
  computeFlirtprint,
  enqueue, ready, pendingBand, releaseHeld, drain,
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

test('pre-band votes are held and released together', () => {
  const db = fresh();
  enqueue(db, { localId: 'v1', kind: 'VOTE', payload: '{}', queuedAt: at(1), bandKnown: false });
  enqueue(db, { localId: 'v2', kind: 'VOTE', payload: '{}', queuedAt: at(1), bandKnown: false });
  enqueue(db, { localId: 'v3', kind: 'VOTE', payload: '{}', queuedAt: at(2), bandKnown: true });

  assert.equal(ready(db).length, 1, 'only the banded vote may send');
  assert.equal(pendingBand(db), 2);

  assert.equal(releaseHeld(db), 2, 'the band resolves and both are released');
  assert.equal(ready(db).length, 3);
  assert.equal(pendingBand(db), 0);
});

test('draining removes only what was sent', () => {
  const db = fresh();
  enqueue(db, { localId: 'v1', kind: 'VOTE', payload: '{}', queuedAt: at(1), bandKnown: true });
  enqueue(db, { localId: 'v2', kind: 'VOTE', payload: '{}', queuedAt: at(2), bandKnown: true });
  drain(db, ['v1']);
  assert.deepEqual(ready(db).map((i) => i.localId), ['v2']);
});

// ---- erasure ----

test('wipe leaves nothing behind', () => {
  const db = fresh();
  recordAnswer(db, answer({ localId: 'a1', cardId: 'c1', choice: 'x', answeredAt: at(1) }));
  enqueue(db, { localId: 'v1', kind: 'VOTE', payload: '{}', queuedAt: at(1), bandKnown: true });
  wipe(db);
  assert.equal(currentAnswers(db).length, 0);
  assert.equal(ready(db).length, 0);
  assert.equal(computeFlirtprint(db, {}, at(2)).answered, 0);
});
