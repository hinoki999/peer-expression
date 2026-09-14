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
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
// `docs` is copied because the gate writes the enforcement map into it —
// a missing directory would fail the control case for a reason that has
// nothing to do with any guarantee.
const COPY = ['packages', 'apps', 'tools', 'db', 'docs'];

/**
 * Each case: the invariant it validates, the edit, and what the gate must
 * say. Matching on the id as well as the exit code matters — a gate that
 * fails for an unrelated reason has not validated anything.
 */
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

for (const c of CASES) {
  const dir = sandbox();
  const target = join(dir, c.file);
  try {
    if (c.remove) rmSync(target, { force: true });
    else if (c.create) writeFileSync(target, c.create);
    else {
      const before = readFileSync(target, 'utf8');
      const after = c.edit(before);
      if (after === before) {
        problems.push(`${c.ids.join('/')} — the mutation changed nothing; the anchor has moved`);
        console.log(`  \x1b[31mFAIL\x1b[0m  ${c.ids.join('/')}  ${c.what} — mutation is stale`);
        continue;
      }
      writeFileSync(target, after);
    }

    const { failed, out } = runGate(dir);
    if (!failed) {
      problems.push(`${c.ids.join('/')} — ${c.what}: the gate passed`);
      console.log(`  \x1b[31mFAIL\x1b[0m  ${c.ids.join('/')}  ${c.what} — gate passed`);
    } else if (!c.expect.test(out)) {
      problems.push(`${c.ids.join('/')} — ${c.what}: failed for the wrong reason`);
      console.log(`  \x1b[31mFAIL\x1b[0m  ${c.ids.join('/')}  ${c.what} — wrong reason`);
    } else {
      console.log(`  \x1b[32mPASS\x1b[0m  ${c.ids.join('/')}  ${c.what}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log('');
if (problems.length) {
  console.error(`\x1b[31m${problems.length} guarantee(s) not actually enforced\x1b[0m`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}
console.log(`\x1b[32m${CASES.length} guarantees refused a real violation\x1b[0m\n`);
