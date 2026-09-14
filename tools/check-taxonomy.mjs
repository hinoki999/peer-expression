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
import {
  BAND_SAFETY_RULES, LADDER, RULES_VERSION, isRuleId, missingRulesFor,
} from '../packages/shared/src/taxonomy/rules.ts';
import { checkSpokenForms } from '../packages/shared/src/taxonomy/spoken.ts';
import { flagCard } from '../packages/shared/src/taxonomy/detector.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const SUBJECTS = ['SELF', 'SYMBOL', 'HYPOTHETICAL', 'AGGREGATE'];
const BANDS = ['B13_15', 'B16_17', 'B18_PLUS'];
const HANDLE = /[@#][A-Za-z0-9_]{2,}/;

const ALLOWED = new Set(SUPPORTED_EMOJI_SEQUENCES);

const problems = [];
const note = (file, id, msg) => problems.push(`${file}${id ? ` [${id}]` : ''}: ${msg}`);

/**
 * CL2 flags. Deliberately a separate list from `problems` — these never
 * fail the build. An empty queue says nothing about whether the cards are
 * safe; it says something about the term list.
 */
const reviewQueue = [];

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

/**
 * CL1a — the ladder. Doc 33 §2.4 builds the sets as derived unions, so
 * this should be true by construction; it is checked anyway, because the
 * next person to touch that file might flatten them into three literals
 * and the property would quietly stop holding.
 *
 * Strictest first: every rule a looser band requires must also be
 * required by every stricter band.
 */
function checkLadder() {
  for (let i = 0; i < LADDER.length - 1; i++) {
    const stricter = LADDER[i];
    const looser = LADDER[i + 1];
    const gap = BAND_SAFETY_RULES[looser].filter(
      (r) => !BAND_SAFETY_RULES[stricter].includes(r),
    );
    if (gap.length) {
      note('BAND_SAFETY_RULES', '', `${stricter} does not require ${gap.join(', ')} but ${looser} does — the ladder is broken, CL1a`);
    }
  }
}

/**
 * CL7 — a card nobody decided about does not ship.
 *
 * This does not judge whether the decision was right. It requires that
 * one was made, by someone, against a stated version of the rules.
 */
function checkReviewRecord(file, id, card) {
  const r = card.reviewRecord;
  if (!r) {
    note(file, id, 'no reviewRecord — unreviewed cards are not eligible, CL7');
    return;
  }
  if (r.disposition !== 'APPROVE') {
    note(file, id, `reviewRecord disposition is ${r.disposition} — only APPROVE is eligible, CL7`);
  }
  if (!r.reviewer) note(file, id, 'reviewRecord names no reviewer — CL7');
  if (!r.reviewedAt) note(file, id, 'reviewRecord has no reviewedAt — CL7');
  if (r.rulesVersion !== RULES_VERSION) {
    note(file, id, `reviewRecord is against rules v${r.rulesVersion}, current is v${RULES_VERSION} — re-review required, CL7`);
  }
}

function validate(file, card, source) {
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
      checkEmoji(file, id, `option "${o.label ?? '?'}"`, `${o.glyph ?? ''}${o.label ?? ''}`);
    }
    // CL4 shape. Whether the wording carries the MEANING is CL4 semantic
    // and belongs to the reviewer; this is the half a machine can hold.
    for (const p of checkSpokenForms(card.options)) {
      note(file, id, `option ${p.optionId}: ${p.problem} — CL4`);
    }
  }

  // CL2's detector. Advisory by construction — collected for the review
  // queue, never added to `problems`. Doc 33: a pattern list that gates
  // merges gets tuned until it stops firing.
  for (const f of flagCard(card)) reviewQueue.push({ file, ...f });
  if (card.redlines?.length) note(file, id, `declares redlines: ${card.redlines.join(', ')}`);

  if (!source?.reviewGated) return;

  // CL1b — does the card clear what each band it claims actually requires?
  //
  // Asked in this direction on purpose. "Is every cleared rule required?"
  // passes trivially for a card with no tags at all, since the empty set
  // is a subset of everything. We ask what the BAND demands.
  const cleared = Array.isArray(card.restrictionsCleared) ? card.restrictionsCleared : [];
  for (const tag of cleared) {
    if (!isRuleId(tag)) note(file, id, `restrictionsCleared has unknown rule "${tag}" — CL1b`);
  }
  for (const band of Array.isArray(card.cohortBands) ? card.cohortBands : []) {
    if (!BAND_SAFETY_RULES[band]) continue;
    const missing = missingRulesFor(band, cleared);
    if (missing.length) {
      note(file, id, `declares ${band} but does not clear ${missing.join(', ')} — CL1b`);
    }
  }

  checkReviewRecord(file, id, card);
}

console.log('\nTaxonomy gate\n');

checkLadder();

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
      for (const card of Array.isArray(parsed) ? parsed : [parsed]) { validate(f, card, src); cards++; }
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
  console.log(`  \x1b[32m+\x1b[0m ${src.path} — emoji + bands only, not review-gated (fixture)`);
}

console.log('');
console.log(`  sources:  ${scanned} of ${CARD_LIBRARY_SOURCES.length} registered`);
console.log(`  cards:    ${cards} across ${seedFiles} seed file(s)`);
console.log(`  manifest: ${SUPPORTED_EMOJI_SEQUENCES.length} permitted sequences`);
console.log(`  rules:    v${RULES_VERSION}, ${BAND_SAFETY_RULES.B13_15.length}/${BAND_SAFETY_RULES.B16_17.length}/${BAND_SAFETY_RULES.B18_PLUS.length} for 13-15 / 16-17 / 18+`);
console.log('');

if (reviewQueue.length) {
  console.log(`  \x1b[33m${reviewQueue.length} card(s) flagged for human review — CL2\x1b[0m`);
  console.log('  These are work items, not verdicts. A flag is a reason to look.');
  console.log('  An unflagged card has not been approved by anything.\n');
  for (const f of reviewQueue) {
    console.log(`    ${f.cardId}  ${f.category}  "${f.matched}"  in ${f.where}`);
  }
  console.log('');
}

if (problems.length) {
  console.error(`\x1b[31m${problems.length} taxonomy violation(s)\x1b[0m`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}
console.log('\x1b[32mAll card content passes the taxonomy\x1b[0m\n');
