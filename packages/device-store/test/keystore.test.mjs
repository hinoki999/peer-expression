import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getOrCreateDbKey, destroyDbKey, toHex, fromHex,
  KEY_BYTES, DB_KEY_ALIAS,
} from '../src/crypto/keystore.ts';

/** A keystore that records what was asked of it. */
function fakeStore() {
  const items = new Map();
  const calls = [];
  return {
    items, calls,
    async set(alias, value) { calls.push(['set', alias]); items.set(alias, value); },
    async get(alias) { calls.push(['get', alias]); return items.get(alias) ?? null; },
    async delete(alias) { calls.push(['delete', alias]); items.delete(alias); },
  };
}

const fixedRandom = (byte) => (n) => new Uint8Array(n).fill(byte);

test('a key is generated on first run and is the right length', async () => {
  const store = fakeStore();
  const key = await getOrCreateDbKey(store, fixedRandom(0xab));
  assert.equal(fromHex(key).length, KEY_BYTES, '256-bit');
  assert.equal(store.items.get(DB_KEY_ALIAS), key, 'and it was persisted');
});

test('the key is stable across calls — a second one would strand the rows', async () => {
  const store = fakeStore();
  const first = await getOrCreateDbKey(store, fixedRandom(0x01));
  const second = await getOrCreateDbKey(store, fixedRandom(0x02));
  assert.equal(second, first, 'a different random source must not produce a new key');
  assert.equal(store.calls.filter(([op]) => op === 'set').length, 1, 'written once');
});

test('two installs do not share a key', async () => {
  const a = await getOrCreateDbKey(fakeStore());
  const b = await getOrCreateDbKey(fakeStore());
  assert.notEqual(a, b);
});

test('a truncated or corrupt stored key is refused, not used', async () => {
  const store = fakeStore();
  store.items.set(DB_KEY_ALIAS, 'abcd');
  await assert.rejects(() => getOrCreateDbKey(store), /wrong length/);

  const bad = fakeStore();
  bad.items.set(DB_KEY_ALIAS, 'z'.repeat(KEY_BYTES * 2));
  await assert.rejects(() => getOrCreateDbKey(bad), /not hex/);
});

test('destroying the key removes it — this is what makes wipe a wipe', async () => {
  const store = fakeStore();
  await getOrCreateDbKey(store);
  await destroyDbKey(store);
  assert.equal(store.items.size, 0);
  assert.equal(await store.get(DB_KEY_ALIAS), null);
});

test('after a destroy, the next run gets a NEW key, not the old one back', async () => {
  const store = fakeStore();
  const before = await getOrCreateDbKey(store, fixedRandom(0x11));
  await destroyDbKey(store);
  const after = await getOrCreateDbKey(store, fixedRandom(0x22));
  assert.notEqual(after, before, 'old rows must stay unreadable');
});

test('no CSPRNG means no key — never a weak one', async () => {
  const original = globalThis.crypto;
  try {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    await assert.rejects(() => getOrCreateDbKey(fakeStore()), /no CSPRNG/);
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
  }
});

test('hex round-trips every byte value', () => {
  const all = new Uint8Array(256).map((_, i) => i);
  assert.deepEqual([...fromHex(toHex(all))], [...all]);
});

// ---- the wipe ----

import { memoryDb } from './helpers.mjs';
import { migrate, recordAnswer, currentAnswers, enqueue, alreadySent } from '../src/index.ts';
import { eraseDevice, eraseKeyOnly } from '../src/erase/index.ts';

test('eraseDevice clears the rows and destroys the key', async () => {
  const db = memoryDb();
  migrate(db);
  const store = fakeStore();
  await getOrCreateDbKey(store);

  recordAnswer(db, {
    localId: 'a1', cardId: 'c1', choice: 'x',
    answeredAt: new Date().toISOString(), latencyMs: 900, dropPosition: 1,
  });
  enqueue(db, {
    localId: 'v1', kind: 'VOTE', cardId: 'c1', payload: '{}',
    queuedAt: new Date().toISOString(), bandState: 'RELEASED',
  });

  await eraseDevice(db, store);

  assert.equal(currentAnswers(db).length, 0, 'history gone');
  assert.equal(alreadySent(db, 'c1'), false, 'sent markers gone');
  assert.equal(await store.get(DB_KEY_ALIAS), null, 'and the key with it');
});

test('the key is destroyed last, so the row delete still works', async () => {
  const db = memoryDb();
  migrate(db);
  const store = fakeStore();
  await getOrCreateDbKey(store);
  await eraseDevice(db, store);

  const ops = store.calls.map(([op]) => op);
  assert.equal(ops[ops.length - 1], 'delete', 'the key goes after the rows');
});

test('eraseKeyOnly works when the database cannot be opened', async () => {
  const store = fakeStore();
  await getOrCreateDbKey(store);
  await eraseKeyOnly(store);
  assert.equal(await store.get(DB_KEY_ALIAS), null);
});
