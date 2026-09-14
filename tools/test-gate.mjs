#!/usr/bin/env node
/**
 * Does the gate actually fail?
 *
 * Doc 33 s0 adds a fourth status — END_TO_END_VALIDATED, "a violation was
 * attempted and refused" — and it is the one most easily faked. A check
 * that has never failed is indistinguishable from a check that cannot
 * fail. Every gate in this repo passed on the day it was written, which
 * is exactly when a check is least trustworthy.
 *
 * I have been breaking these by hand and reporting the result in a commit
 * message. That is not evidence: nobody can re-run it, and the next
 * refactor that quietly neuters a check will pass review the same way.
 * This turns each of those one-off mutations into something CI repeats.
 *
 * Method: copy the tree to a scratch directory, break one thing there,
 * run the gate against the copy, require a non-zero exit AND the right
 * invariant named in the output. The working tree is never modified, so
 * an interrupted run cannot leave a sabotaged file behind — which the
 * by-hand version could, and nearly did.
 */
import {
  cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Where the evidence goes. Not committed — it records a run, and a
 * committed one would be a claim about a run that may never have happened
 * on this tree.
 */
const RESULT = join(ROOT, '.gate/self-test.json');
// `docs` is copied because the gate writes the enforcement map into it —
// a missing directory would fail the control case for a reason that has
// nothing to do with any guarantee.
const COPY = ['packages', 'apps', 'tools', 'db', 'docs'];

/**
 * Each case: the invariant it validates, the edit, and what the gate must
 * say. Matching on the id as well as the exit code matters — a gate that
 * fails for an unrelated reason has not validated anything.
 */
/**
 * Card fixtures for the content cases. Written out rather than generated
 * so a reader can see exactly which rule each one fails.
 */
const ALL_RULES = ['R_person_subject','R_harm_solicitation','R_harm_normalization','R_sexual_activity','R_appearance_rating','R_body_commentary','R_identifying_detail','R_meetup_coordination','R_private_media','R_substance','R_dating_platform','R_adult_setting','R_romantic_escalation'];

const baseCard = (over) => ({
  cardId: 'mutation', subjectType: 'SELF', frameId: 'f', body: 'x',
  voiceLine: null,
  cohortBands: ['B13_15'],
  restrictionsCleared: ALL_RULES,
  reviewRecord: { disposition: 'APPROVE', reviewer: 'Atlas', reviewedAt: '2026-09-14', rulesVersion: 2 },
  options: [
    { optionId: 'a', label: 'yes', glyph: null, spokenForm: 'yes', ordinal: 0 },
    { optionId: 'b', label: 'no', glyph: null, spokenForm: 'no', ordinal: 1 },
  ],
  ...over,
});

/** Claims 13-15 but has not cleared the 13-15-only rule. */
const CARD_UNDERCLEARED = baseCard({
  restrictionsCleared: ALL_RULES.filter((r) => r !== 'R_romantic_escalation'),
});

/** Nobody decided about it. */
const CARD_NO_RECORD = baseCard({ reviewRecord: null });

/** Reviewed, but against a vocabulary that has since changed. */
const CARD_STALE_RULES = baseCard({
  reviewRecord: { disposition: 'APPROVE', reviewer: 'Atlas', reviewedAt: '2026-09-01', rulesVersion: 1 },
});

const CASES = [
  {
    ids: ['CL5'],
    what: 'a Unicode 14 sequence in a card source',
    file: 'apps/mobile/src/state/mock.ts',
    edit: (s) => s.replace(/glyph: '🙃'/, "glyph: '\u{1FAE5}'"),
    expect: /CL5|SUPPORTED_EMOJI_SEQUENCES/,
  },
  {
    ids: ['CL6'],
    what: 'a registered card source deleted',
    file: 'apps/mobile/src/state/mock.ts',
    remove: true,
    expect: /CL6|registered card source is missing/,
  },
  {
    ids: ['CL1a'],
    what: 'the conservatism ladder broken',
    file: 'packages/shared/src/taxonomy/rules.ts',
    edit: (s) => s.replace(
      /const B13_15_EXTRA: readonly RuleId\[\] = \['R_romantic_escalation'\];/,
      "const B13_15_EXTRA: readonly RuleId[] = [];\nconst _unused: readonly RuleId[] = ['R_romantic_escalation'];",
    ).replace(
      /B16_17: \[\.\.\.PRODUCT_WIDE, \.\.\.UNDER_18_EXTRA\],/,
      'B16_17: [...PRODUCT_WIDE, ...UNDER_18_EXTRA, ..._unused],',
    ),
    expect: /CL1a|ladder is broken/,
  },
  {
    ids: ['CL1b'],
    what: 'a card declaring a band whose rules it does not clear',
    file: 'db/seed/cards/_mutation.json',
    create: JSON.stringify([CARD_UNDERCLEARED], null, 2),
    expect: /CL1b|does not clear/,
  },
  {
    ids: ['CL7'],
    what: 'a card with no review record',
    file: 'db/seed/cards/_mutation.json',
    create: JSON.stringify([CARD_NO_RECORD], null, 2),
    expect: /CL7|no reviewRecord/,
  },
  {
    ids: ['CL7'],
    what: 'a review record against a superseded rule version',
    file: 'db/seed/cards/_mutation.json',
    create: JSON.stringify([CARD_STALE_RULES], null, 2),
    expect: /CL7|re-review required/,
  },
  {
    ids: ['CL3'],
    what: 'a card with no cohort bands',
    file: 'db/seed/cards/_mutation.json',
    create: JSON.stringify([{
      cardId: 'mutation', subjectType: 'SELF', frameId: 'f', body: 'no bands',
      cohortBands: [], options: [
        { optionId: 'a', label: 'yes', glyph: null, spokenForm: 'yes', ordinal: 0 },
        { optionId: 'b', label: 'no', glyph: null, spokenForm: 'no', ordinal: 1 },
      ],
    }], null, 2),
    expect: /CL3|cohortBands absent or empty/,
  },
  {
    ids: ['I6b'],
    what: 'keychain accessibility loosened off device-only',
    file: 'apps/mobile/src/store/secureKeyStore.ts',
    edit: (s) => s.replace(
      /keychainAccessible: SecureStore\.WHEN_UNLOCKED_THIS_DEVICE_ONLY,\n(\s+)requireAuthentication/,
      'keychainAccessible: SecureStore.WHEN_UNLOCKED,\n$1requireAuthentication',
    ),
    expect: /I6b|not device-only/,
  },
  {
    ids: ['I6b'],
    what: 'android.allowBackup removed',
    file: 'apps/mobile/app.config.ts',
    edit: (s) => s.replace(/allowBackup: false,/, ''),
    expect: /I6b|allowBackup/,
  },
  {
    ids: ['I16b'],
    what: 'the one-vote-per-card unique index dropped',
    file: 'packages/device-store/src/migrations/index.ts',
    edit: (s) => s.replace(/CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_one_vote/, 'CREATE INDEX IF NOT EXISTS idx_outbox_one_vote'),
    expect: /I16b|unique index/,
  },
  {
    ids: ['I22'],
    what: 'a privacy floor crossed',
    file: 'packages/shared/src/constants/thresholds.ts',
    edit: (s) => s.replace(/MIN_CELL_PUBLIC = 500/, 'MIN_CELL_PUBLIC = 100'),
    expect: /I22|below floor/,
  },
  {
    ids: [],
    what: 'copy claiming chronological age',
    file: 'packages/shared/src/taxonomy/cohorts.ts',
    edit: (s) => s.replace(/B16_17: 'your age-range group'/, "B16_17: 'people your age'"),
    expect: /chronological age|people your age/,
  },
  {
    ids: ['I15'],
    what: 'publication scope widened to string',
    file: 'packages/shared/src/taxonomy/cohorts.ts',
    edit: (s) => s.replace(
      /export type PublicationScope = CohortBand \| typeof GLOBAL_SCOPE;/,
      'export type PublicationScope = string;',
    ),
    expect: /I15|closed union/,
  },
];

function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'pe-gate-'));
  for (const d of COPY) {
    const from = join(ROOT, d);
    if (existsSync(from)) cpSync(from, join(dir, d), { recursive: true });
  }
  return dir;
}

function runGate(dir) {
  try {
    const out = execFileSync(process.execPath, [join(dir, 'tools/check-invariants.mjs')], {
      stdio: 'pipe', encoding: 'utf8',
    });
    return { failed: false, out };
  } catch (e) {
    return { failed: true, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

console.log('\nGate self-test — each case breaks one guarantee on a copy\n');

const problems = [];

// Control. If the untouched copy fails, every result below is noise.
{
  const dir = sandbox();
  const { failed, out } = runGate(dir);
  rmSync(dir, { recursive: true, force: true });
  if (failed) {
    console.error('  \x1b[31mFAIL\x1b[0m  control — an unmodified copy does not pass');
    console.error(out.split('\n').filter((l) => l.includes('-')).slice(-3).join('\n'));
    process.exit(1);
  }
  console.log('  \x1b[32mPASS\x1b[0m  control — an unmodified copy passes');
}

/** Ids that survived a real mutation. This is the evidence — not CASES. */
const passedIds = new Set();
const failedIds = new Set();

for (const c of CASES) {
  const dir = sandbox();
  const target = join(dir, c.file);
  const label = c.ids.length ? c.ids.join('/') : '(unregistered rule)';
  try {
    if (c.remove) {
      // It has to have been there, or deleting it proves nothing.
      if (!existsSync(target)) throw new Error(`${c.file} is not in the sandbox`);
      rmSync(target, { force: true });
    } else if (c.create) {
      // db/seed/cards is an empty directory, and git does not track those
      // — so it existed for whoever made it locally and for nobody else.
      // That is how this file shipped crashing at case 3 with six live
      // cases behind it never running. Create the parent, never assume it.
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, c.create);
    } else {
      if (!existsSync(target)) throw new Error(`${c.file} is not in the sandbox`);
      const before = readFileSync(target, 'utf8');
      const after = c.edit(before);
      if (after === before) throw new Error('the mutation changed nothing — the anchor has moved');
      writeFileSync(target, after);
    }

    const { failed, out } = runGate(dir);
    if (!failed) throw new Error('the gate passed');
    if (!c.expect.test(out)) throw new Error('the gate failed for the wrong reason');

    for (const id of c.ids) passedIds.add(id);
    console.log(`  \x1b[32mPASS\x1b[0m  ${label}  ${c.what}`);
  } catch (e) {
    // Collect, never abort. A self-test that stops at the first problem
    // cannot report the state of the remaining cases — which is precisely
    // how six of them sat unrun behind one crash.
    for (const id of c.ids) failedIds.add(id);
    problems.push(`${label} — ${c.what}: ${e.message}`);
    console.log(`  \x1b[31mFAIL\x1b[0m  ${label}  ${c.what} — ${e.message}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Emit what actually happened.
 *
 * The gate used to establish END_TO_END_VALIDATED by scanning this file's
 * source for an `ids:` array, which proves a case is *written* — not that
 * it ran, and not that it passed. With the run aborting at case 3, five
 * invariants held the status on cases that had never executed, including
 * the device key and the privacy floors.
 *
 * `sourceHash` binds the evidence to the file that produced it, so a case
 * edited to assert nothing invalidates the run rather than inheriting its
 * credit.
 */
mkdirSync(dirname(RESULT), { recursive: true });
writeFileSync(RESULT, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  sourceHash: createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),
  cases: CASES.length,
  passed: [...passedIds].sort(),
  failed: [...failedIds].sort(),
  clean: problems.length === 0,
}, null, 2)}\n`);

console.log('');
console.log(`  wrote .gate/self-test.json — ${passedIds.size} id(s) proved`);

console.log('');
if (problems.length) {
  console.error(`\x1b[31m${problems.length} guarantee(s) not actually enforced\x1b[0m`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}
console.log(`\x1b[32m${CASES.length} guarantees refused a real violation\x1b[0m\n`);
