#!/usr/bin/env node
/**
 * Validates every seed card against the taxonomy before it can merge.
 *
 * Exists now, ahead of the first card, because the alternative is the
 * first card landing unchecked and the job being written afterwards to
 * fit what already shipped.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SEEDS = join(ROOT, 'db/seed/cards');

const SUBJECTS = ['SELF', 'SYMBOL', 'HYPOTHETICAL', 'AGGREGATE'];
const BANDS = ['B13_15', 'B16_17', 'B18_PLUS'];
const HANDLE = /[@#][A-Za-z0-9_]{2,}/;

const problems = [];
const note = (file, id, msg) => problems.push(`${file}${id ? ` [${id}]` : ''}: ${msg}`);

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
  if (!Array.isArray(card.options) || card.options.length < 2) {
    note(file, id, 'fewer than two options');
  } else {
    for (const o of card.options) {
      if (!o.spokenForm) note(file, id, `option "${o.label ?? '?'}" has no spokenForm — accessibility is content work, not engineering`);
    }
  }
  if (card.redlines?.length) note(file, id, `declares redlines: ${card.redlines.join(', ')}`);
}

if (!existsSync(SEEDS)) {
  console.log('\nTaxonomy gate\n\n  no db/seed/cards directory yet — nothing to check\n');
  process.exit(0);
}

const files = readdirSync(SEEDS).filter((f) => extname(f) === '.json');
console.log('\nTaxonomy gate\n');

if (files.length === 0) {
  console.log('  no seed cards yet — the gate is in place for when there are\n');
  process.exit(0);
}

let count = 0;
for (const f of files) {
  let parsed;
  try { parsed = JSON.parse(readFileSync(join(SEEDS, f), 'utf8')); }
  catch (e) { note(f, '', `not valid JSON: ${e.message}`); continue; }
  for (const card of Array.isArray(parsed) ? parsed : [parsed]) { validate(f, card); count++; }
}

console.log(`  ${count} card(s) across ${files.length} file(s)\n`);
if (problems.length) {
  console.error(`\x1b[31m${problems.length} taxonomy violation(s)\x1b[0m`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}
console.log('\x1b[32mAll seed cards pass the taxonomy\x1b[0m\n');
