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
import { CARD_LIBRARY_SOURCES } from '../packages/shared/src/taxonomy/sources.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

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
  // CL3. An absent or empty band list is not "all ages" — it is a card
  // nobody decided about, and a set comparison against an empty set
  // passes trivially, which is what would make CL1b meaningless.
  if (!Array.isArray(card.cohortBands) || card.cohortBands.length === 0) {
    note(file, id, 'cohortBands absent or empty — CL3 forbids an implicit default');
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
let scanned = 0;

/**
 * Iterate the registry, never a hardcoded path. CL6: a registered source
 * that has gone missing fails the build rather than quietly reducing what
 * gets checked — which is the exact shape of the bug this replaced.
 */
for (const src of CARD_LIBRARY_SOURCES) {
  const abs = join(ROOT, src.path);

  if (!existsSync(abs)) {
    if (src.optional) {
      console.log(`  \x1b[33m-\x1b[0m ${src.path} — not present yet (declared optional)`);
      continue;
    }
    note(src.path, '', 'registered card source is missing — CL6. Remove it from CARD_LIBRARY_SOURCES deliberately, or restore it.');
    continue;
  }

  scanned++;

  if (src.kind === 'seed-directory') {
    const files = readdirSync(abs).filter((f) => extname(f) === '.json');
    seedFiles += files.length;
    for (const f of files) {
      let parsed;
      try { parsed = JSON.parse(readFileSync(join(abs, f), 'utf8')); }
      catch (e) { note(f, '', `not valid JSON: ${e.message}`); continue; }
      for (const card of Array.isArray(parsed) ? parsed : [parsed]) { validate(f, card); cards++; }
    }
    console.log(`  \x1b[32m+\x1b[0m ${src.path} — ${files.length} file(s), ${cards} card(s)`);
    continue;
  }

  /**
   * A module has no structure to walk, so every emoji in it is checked
   * instead — broader than the per-card rule, deliberately. Breadth is
   * the right default where precision is unavailable, and a mock card is
   * still content somebody will copy.
   */
  checkEmoji(src.path, '', 'source', stripComments(readFileSync(abs, 'utf8')));
  console.log(`  \x1b[32m+\x1b[0m ${src.path} — scanned for emoji`);
}

console.log('');
console.log(`  sources:  ${scanned} of ${CARD_LIBRARY_SOURCES.length} registered`);
console.log(`  cards:    ${cards} across ${seedFiles} seed file(s)`);
console.log(`  manifest: ${SUPPORTED_EMOJI_SEQUENCES.length} permitted sequences`);
console.log('');

if (problems.length) {
  console.error(`\x1b[31m${problems.length} taxonomy violation(s)\x1b[0m`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}
console.log('\x1b[32mAll card content passes the taxonomy\x1b[0m\n');
