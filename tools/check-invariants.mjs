#!/usr/bin/env node
/**
 * The invariant gate. Runs on every commit, with no build step and no
 * dependencies, so it works from commit one and keeps working.
 *
 * These are structural checks over the source. Runtime checks against a
 * live binding are added when the binding lands — the tests do not change.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
let failures = [];
const ok = (id, what) => console.log(`  \x1b[32mPASS\x1b[0m ${id}  ${what}`);
const bad = (id, what, why) => { failures.push(`${id} ${what}: ${why}`);
  console.log(`  \x1b[31mFAIL\x1b[0m ${id}  ${what}\n        ${why}`); };

function read(p) { return readFileSync(join(ROOT, p), 'utf8'); }

/** Scan code, not prose. Comments describe the rules and legitimately
 *  name the things the rules forbid. */
function code(p) {
  return read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
    .replace(/(?<!:)\/\/.*$/gm, '');      // line + trailing comments, sparing URLs
}
function walk(dir, out = []) {
  for (const e of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, e);
    if (e === 'node_modules' || e === '.git') continue;
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (['.ts', '.tsx'].includes(extname(e))) out.push(rel);
  }
  return out;
}

console.log('\nInvariant gate\n');

// ---- I1 : exactly four card subjects ----
{
  const src = read('packages/shared/src/taxonomy/subjects.ts');
  const m = src.match(/CARD_SUBJECTS = \[([^\]]*)\]/s);
  const n = m ? m[1].split(',').filter((x) => x.trim()).length : 0;
  n === 4 ? ok('I1', 'four card subjects')
          : bad('I1', 'four card subjects', `found ${n}`);
}

// ---- I2 : the vote counter carries no account key and no timestamp ----
{
  const src = code('packages/shared/src/model/index.ts');
  const m = src.match(/interface VoteCounterKey \{([^}]*)\}/s);
  const body = m ? m[1] : '';
  const banned = ['accountId', 'userId', 'timestamp', 'answeredAt', 'ts:'];
  const hit = banned.filter((b) => body.includes(b));
  hit.length === 0 ? ok('I2', 'counters carry no identity or timestamp')
                   : bad('I2', 'counters carry no identity or timestamp', `found ${hit.join(', ')}`);
}

// ---- I13 / I17 : contract surface audit ----
{
  const src = code('packages/shared/src/contracts/index.ts');
  const banned = [
    ['recipient', 'I17 — an operation takes a recipient'],
    ['toAccount', 'I17 — an operation targets an account'],
    ['rawCount', 'I13 — an operation returns raw counts'],
    ['numerator', 'I13 — an operation exposes a numerator'],
    ['sampleSize', 'I13 — an operation exposes sample size'],
    ['votedAt', 'I2 — an operation exposes a vote timestamp'],
  ];
  const hits = banned.filter(([t]) => src.includes(t));
  hits.length === 0 ? ok('I13/I17', 'contract surface clean')
                    : bad('I13/I17', 'contract surface clean', hits.map((h) => h[1]).join('; '));
}

// ---- I22 : privacy parameter floors ----
{
  const src = read('packages/shared/src/constants/thresholds.ts');
  const num = (name) => {
    const m = src.match(new RegExp(`${name} = (\\d+)`));
    return m ? Number(m[1]) : NaN;
  };
  const checks = [
    ['MIN_CELL_PUBLIC', num('MIN_CELL_PUBLIC'), num('MIN_CELL_PUBLIC_FLOOR')],
    ['MIN_BATCH_DELTA', num('MIN_BATCH_DELTA'), num('MIN_BATCH_DELTA_FLOOR')],
  ];
  let bust = [];
  for (const [name, value, floor] of checks) {
    if (!Number.isFinite(value) || !Number.isFinite(floor)) bust.push(`${name} unreadable`);
    else if (value < floor) bust.push(`${name}=${value} below floor ${floor}`);
  }
  bust.length === 0 ? ok('I22', 'privacy parameters at or above their floors')
                    : bad('I22', 'privacy parameters at or above their floors', bust.join('; '));
}

// ---- I30 : the band is signed, not a loose field on a vote ----
{
  const src = code('packages/shared/src/contracts/index.ts');
  const m = src.match(/interface VoteSubmission \{([^}]*)\}/s);
  const body = m ? m[1] : '';
  const loose = ['cohortBand', 'scope', 'band'].filter((f) =>
    new RegExp(`^\\s*${f}[?]?:`, 'm').test(body));
  loose.length === 0 && body.includes('assertion')
    ? ok('I30', 'band travels in the signed assertion only')
    : bad('I30', 'band travels in the signed assertion only',
          loose.length ? `loose field(s): ${loose.join(', ')}` : 'no assertion on VoteSubmission');
}

// ---- structural: no forbidden schema objects anywhere ----
{
  const forbidden = ['avatarUrl', 'displayName', 'schoolId', 'followerCount', 'likeCount'];
  const hits = [];
  for (const f of walk('packages').concat(walk('apps'))) {
    const src = code(f);
    for (const t of forbidden) if (src.includes(t)) hits.push(`${t} in ${f}`);
  }
  hits.length === 0 ? ok('ABSENT', 'no forbidden schema objects')
                    : bad('ABSENT', 'no forbidden schema objects', hits.join('; '));
}

// ---- registry completeness ----
{
  const src = read('packages/shared/src/invariants/registry.ts');
  const n = (src.match(/id:'I\d+'/g) || []).length;
  n === 30 ? ok('REGISTRY', '30 invariants recorded')
           : bad('REGISTRY', '30 invariants recorded', `found ${n}`);
}

console.log('');
if (failures.length) {
  console.error(`\x1b[31m${failures.length} invariant failure(s)\x1b[0m\n`);
  process.exit(1);
}
console.log('\x1b[32mAll invariant checks passed\x1b[0m\n');
