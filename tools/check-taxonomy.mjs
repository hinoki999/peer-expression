#!/usr/bin/env node
/**
 * Validates card content against the taxonomy before it can merge.
 *
 * Exists now, ahead of the first seed card, because the alternative is
 * the first card landing unchecked and the job being written afterwards
 * to fit what already shipped.
 *
 * Two scan roots, and the second one matters. Doc 32 caught that a claim
 * about this gate — "you cannot merge a card that uses one" — was false:
 * it walked db/seed/cards/, which is empty, while the only emoji in the
 * repo lived in the app package's mock cards, which it never opened. A
 * gate that reads an empty directory guarantees nothing about content
 * that exists somewhere else.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SUPPORTED_EMOJI_SEQUENCES, extractEmojiSequences, describeSequence,
} from '../packages/shared/src/taxonomy/emoji.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SEEDS = join(ROOT, 'db/seed/cards');

/** Card content that is not a seed file. Every entry gets emoji-checked. */
const MOCK_SOURCES = ['apps/mobile/src/state/mock.ts'];

const SUBJECTS = ['SELF', 'SYMBOL', 'HYPOTHETICAL', 'AGGREGATE'];
const BANDS = ['B13_15', 'B16_17', 'B18_PLUS'];
const HANDLE = /[@#][A-Za-z0-9_]{2,}/;

const ALLOWED = new Set(SUPPORTED_EMOJI_SEQUENCES);

const problems = [];
const note = (file, id, msg) => problems.push(`${file}${id ? ` [${id}]` : ''}: ${msg}`);

/** Prose legitimately names glyphs the rules forbid; code does not. */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(?<!:)\/\/.*$/gm, '');

function checkEmoji(file, id, where, text) {
  if (!text) return;
  const seen = new Set();
  for (const seq of extractEmojiSequences(text)) {
    if (ALLOWED.has(seq) || seen.has(seq)) continue;
    seen.add(seq);
    note(file, id, `${where} uses ${seq} (${describeSequence(seq)}), not in SUPPORTED_EMOJI_SEQUENCES — I31`);
  }
}

function validate(file, card) {
  const id = card.cardId ?? '?';
  if (!SUBJECTS.includes(card.subjectType)) {
    note(file, id, `subjectType "${card.subjectType}" is not one of ${SUBJECTS.join(', ')} — I1`);
  }
  if (!Array.isArray(card.cohortBands) || card.cohortBands.length === 0) {
    note(file, id, 'no cohortBands');
  } else {
    for (const b of card.cohortBands) if (!BANDS.includes(b)) note(file, id, `unknown band "${b}"`);
  }
  if (!card.body || typeof card.body !== 'string') note(file, id, 'no body');
  if (card.body && HANDLE.test(card.body)) note(file, id, 'body contains a handle — I21 / redlines');
  // Bodies too, not only option glyphs. Doc 28: the mock already carries
  // inline emoji in body copy, which is also the bundled-face case.
  checkEmoji(file, id, 'body', card.body);
  if (!Array.isArray(card.options) || card.options.length < 2) {
    note(file, id, 'fewer than two options');
  } else {
    for (const o of card.options) {
      if (!o.spokenForm) note(file, id, `option "${o.label ?? '?'}" has no spokenForm — accessibility is content work, not engineering`);
      checkEmoji(file, id, `option "${o.label ?? '?'}"`, `${o.glyph ?? ''}${o.label ?? ''}`);
    }
  }
  if (card.redlines?.length) note(file, id, `declares redlines: ${card.redlines.join(', ')}`);
}

console.log('\nTaxonomy gate\n');

let cards = 0;
let seedFiles = 0;

if (existsSync(SEEDS)) {
  const files = readdirSync(SEEDS).filter((f) => extname(f) === '.json');
  seedFiles = files.length;
  for (const f of files) {
    let parsed;
    try { parsed = JSON.parse(readFileSync(join(SEEDS, f), 'utf8')); }
    catch (e) { note(f, '', `not valid JSON: ${e.message}`); continue; }
    for (const card of Array.isArray(parsed) ? parsed : [parsed]) { validate(f, card); cards++; }
  }
}

/**
 * Mock cards are TypeScript, so there is no structure to walk. Every
 * emoji in the file is checked instead — broader than the seed rule, and
 * deliberately so: breadth is the right default where precision is not
 * available, and a mock card is still content someone will copy.
 */
let mockScanned = 0;
for (const rel of MOCK_SOURCES) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) continue;
  mockScanned++;
  checkEmoji(rel, '', 'source', stripComments(readFileSync(p, 'utf8')));
}

console.log(`  seed cards:   ${cards} across ${seedFiles} file(s)`);
console.log(`  mock sources: ${mockScanned} scanned`);
console.log(`  manifest:     ${SUPPORTED_EMOJI_SEQUENCES.length} permitted sequences`);
console.log('');

if (problems.length) {
  console.error(`\x1b[31m${problems.length} taxonomy violation(s)\x1b[0m`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}
console.log('\x1b[32mAll card content passes the taxonomy\x1b[0m\n');
