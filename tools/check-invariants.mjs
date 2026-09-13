#!/usr/bin/env node
/**
 * The invariant gate.
 *
 * Zero dependencies and no build step, so it works from commit one and a
 * dependency change cannot break it.
 *
 * It does not count invariants. It diffs the checks that actually ran
 * against the registry and fails on any gap — an invariant is either
 * enforced here, or explicitly marked pending with a reason. Adding a new
 * one fails the build until somebody does one or the other.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/** Scan code, not prose — comments legitimately name what the rules forbid. */
const code = (p) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(?<!:)\/\/.*$/gm, '');

function walk(dir, out = []) {
  for (const e of readdirSync(join(ROOT, dir))) {
    if (e === 'node_modules' || e === '.git' || e === 'dist') continue;
    const rel = join(dir, e);
    if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (['.ts', '.tsx'].includes(extname(e))) out.push(rel);
  }
  return out;
}

const enforced = new Set();
const failures = [];

/** Every check declares the invariant IDs it enforces. */
function check(ids, label, fn) {
  for (const id of ids) {
    if (enforced.has(id)) failures.push(`${id} is enforced by more than one check`);
    enforced.add(id);
  }
  let problem = null;
  try { problem = fn(); } catch (e) { problem = `threw: ${e.message}`; }
  const tag = ids.join('/');
  if (problem) {
    failures.push(`${tag} ${label}: ${problem}`);
    console.log(`  \x1b[31mFAIL\x1b[0m ${tag.padEnd(9)} ${label}\n        ${problem}`);
  } else {
    console.log(`  \x1b[32mPASS\x1b[0m ${tag.padEnd(9)} ${label}`);
  }
}

const body = (src, name) => (src.match(new RegExp(`interface ${name} \\{([^}]*)\\}`, 's')) ?? [, ''])[1];

console.log('\nInvariant gate\n');

check(['I1'], 'four card subjects', () => {
  const m = code('packages/shared/src/taxonomy/subjects.ts').match(/CARD_SUBJECTS = \[([^\]]*)\]/s);
  const n = m ? m[1].split(',').filter((x) => x.trim()).length : 0;
  return n === 4 ? null : `found ${n}`;
});

check(['I2'], 'counters carry no identity or timestamp', () => {
  const b = body(code('packages/shared/src/model/index.ts'), 'VoteCounterKey');
  const hit = ['accountId', 'userId', 'timestamp', 'answeredAt'].filter((x) => b.includes(x));
  return hit.length ? `found ${hit.join(', ')}` : null;
});

check(['I5'], 'no personal history crosses the contract', () => {
  const src = code('packages/shared/src/contracts/index.ts');
  const hit = ['LocalAnswer', 'Flirtprint', 'answerHistory', 'localHistory'].filter((x) => src.includes(x));
  return hit.length ? `contract references ${hit.join(', ')}` : null;
});

check(['I7'], 'no read operation accepts a client-supplied scope', () => {
  const src = code('packages/shared/src/contracts/index.ts');
  if (/getStatistics\([^)]*scope/.test(src)) return 'getStatistics takes a scope';
  if (/scope\s*:/.test(body(src, 'DropRequest'))) return 'DropRequest carries a scope';
  return null;
});

check(['I11', 'I12'], 'a vote returns no statistic', () => {
  const b = body(code('packages/shared/src/contracts/index.ts'), 'VoteAccepted');
  const hit = ['distribution', 'statistic', 'count', 'pending', 'percent'].filter((x) => b.includes(x));
  return hit.length ? `VoteAccepted exposes ${hit.join(', ')}` : null;
});

check(['I13', 'I17'], 'contract surface clean', () => {
  const src = code('packages/shared/src/contracts/index.ts');
  const banned = [
    ['recipient', 'an operation takes a recipient'],
    ['toAccount', 'an operation targets an account'],
    ['rawCount', 'an operation returns raw counts'],
    ['numerator', 'an operation exposes a numerator'],
    ['sampleSize', 'an operation exposes sample size'],
    ['votedAt', 'an operation exposes a vote timestamp'],
  ].filter(([t]) => src.includes(t));
  return banned.length ? banned.map((b) => b[1]).join('; ') : null;
});

check(['I15'], 'publication scope is a closed union', () => {
  const src = code('packages/shared/src/taxonomy/cohorts.ts');
  if (!/PublicationScope = CohortBand \| typeof GLOBAL_SCOPE/.test(src)) return 'scope is not a closed union';
  if (/string/.test(src.match(/type PublicationScope[^;]*/s)?.[0] ?? '')) return 'scope widens to string';
  return null;
});

check(['I16'], 'local history is append-only', () => {
  const src = code('packages/device-store/src/answers/index.ts');
  const hit = ['export function update', 'export function overwrite', 'export function setAnswer', 'UPDATE answer_local']
    .filter((x) => src.includes(x));
  return hit.length ? `found ${hit.join(', ')}` : null;
});

/**
 * I16's second half. Append-only history is only half the guarantee: a
 * revision must not produce a second contribution to the counters. The
 * absence of an update path says nothing about that, so it is checked
 * separately at the two places the structure has to hold it — the schema
 * and the queue.
 */
check(['I16b'], 'a card contributes to the counters at most once', () => {
  const mig = code('packages/device-store/src/migrations/index.ts');
  const box = code('packages/device-store/src/outbox/index.ts');
  const bust = [];

  if (!/UNIQUE INDEX[^;]*ON outbox\(card_id\)[^;]*kind = 'VOTE'/is.test(mig))
    bust.push('no unique index on (card_id) where kind = VOTE');
  if (!/CREATE TABLE IF NOT EXISTS vote_sent/i.test(mig))
    bust.push('no vote_sent table — the marker must outlive the drain');
  if (!/INSERT INTO vote_sent/i.test(box))
    bust.push('drain does not record that the card contributed');
  if (!/alreadySent\(db, cardId\)/.test(box))
    bust.push('enqueue does not consult the sent marker');
  if (!/band_state = 'RELEASED'/.test(box))
    bust.push('ready() does not gate on RELEASED');

  return bust.length ? bust.join('; ') : null;
});

check(['I22'], 'privacy parameters at or above their floors', () => {
  const src = code('packages/shared/src/constants/thresholds.ts');
  const num = (n) => Number((src.match(new RegExp(`${n} = (\\d+)`)) ?? [, NaN])[1]);
  const bust = [];
  for (const n of ['MIN_CELL_PUBLIC', 'MIN_BATCH_DELTA']) {
    const v = num(n), f = num(`${n}_FLOOR`);
    if (!Number.isFinite(v) || !Number.isFinite(f)) bust.push(`${n} unreadable`);
    else if (v < f) bust.push(`${n}=${v} below floor ${f}`);
  }
  return bust.length ? bust.join('; ') : null;
});

check(['I24'], 'usage exposes a milestone, never a count or a per-format lookup', () => {
  const src = code('packages/shared/src/contracts/index.ts');
  const b = body(src, 'UsageMilestone');
  if (/\bcount\b|\bexact\b|\bprogress\b/.test(b)) return 'UsageMilestone exposes a count';
  if (/getUsageMilestone\s*\(\s*formatId/.test(src)) return 'a per-format authenticated lookup exists';
  return null;
});

check(['I26'], 'the global scope is never labelled as peer data', () => {
  const src = code('packages/shared/src/taxonomy/cohorts.ts');
  const m = src.match(/SCOPE_LABEL[^=]*=\s*\{([^}]*)\}/s);
  if (!m) return 'SCOPE_LABEL not found';
  const g = m[1].match(/GLOBAL_ONBOARDING:\s*'([^']*)'/);
  if (!g) return 'no label for the global scope';
  return /your age|people like you|peers/i.test(g[1]) ? `global scope reads "${g[1]}"` : null;
});

check(['I30'], 'band travels in the signed assertion only', () => {
  const src = code('packages/shared/src/contracts/index.ts');
  const b = body(src, 'VoteSubmission');
  const loose = ['cohortBand', 'scope', 'band'].filter((f) => new RegExp(`^\\s*${f}[?]?:`, 'm').test(b));
  if (loose.length) return `loose field(s): ${loose.join(', ')}`;
  return b.includes('assertion') ? null : 'no assertion on VoteSubmission';
});

// ---- structural sweep: objects the architecture forbids outright ----
check([], 'no forbidden schema objects', () => {
  const forbidden = [
    'avatarUrl', 'displayName', 'schoolId', 'followerCount', 'likeCount',
    'recipientId', 'threadId', 'replyTo', 'followerIds', 'latitude', 'longitude',
  ];
  const hits = [];
  for (const f of [...walk('packages'), ...walk('apps')]) {
    const src = code(f);
    for (const t of forbidden) if (src.includes(t)) hits.push(`${t} in ${f}`);
  }
  return hits.length ? hits.join('; ') : null;
});

// ---- coverage, and the attribution discipline (doc 32) ----
console.log('');
const reg = read('packages/shared/src/invariants/registry.ts');

/** Split the registry into one blob per entry so fields can't leak across. */
const entries = [...reg.matchAll(/\{\s*id:\s*'(I\d+[a-z]?)'([\s\S]*?)(?=\n\n  \{ id:|\n\];)/g)]
  .map((m) => ({ id: m[1], body: m[2] }));

const registered = entries.map((e) => e.id);
const field = (e, name) => new RegExp(`\\b${name}\\s*:`).test(e.body);
const enumOf = (e, name) => (e.body.match(new RegExp(`\\b${name}\\s*:\\s*'([^']*)'`)) ?? [, ''])[1];

const ENFORCEMENT_CLASSES = [
  'client-affordance', 'server-validation', 'signed-assertion',
  'ci-assertion', 'human-process',
];

const pending = new Set(entries.filter((e) => field(e, 'pending')).map((e) => e.id));
const ciCovered = new Set(entries.filter((e) => field(e, 'ciScope')).map((e) => e.id));

const dupes = registered.filter((id, i) => registered.indexOf(id) !== i);
if (dupes.length) failures.push(`registry lists ${[...new Set(dupes)].join(', ')} more than once`);

const unknown = [...enforced].filter((id) => !registered.includes(id));
if (unknown.length) failures.push(`checks reference unregistered invariants: ${unknown.join(', ')}`);

const uncovered = registered.filter((id) => !enforced.has(id) && !pending.has(id));
if (uncovered.length) {
  failures.push(`registered with neither a check nor a pending reason: ${uncovered.join(', ')}`);
}

// --- the attribution rules themselves ---

for (const e of entries) {
  const cls = enumOf(e, 'enforcement');
  if (!cls) {
    failures.push(`${e.id} declares no enforcement class — name where the guarantee holds`);
  } else if (!ENFORCEMENT_CLASSES.includes(cls)) {
    failures.push(`${e.id} enforcement '${cls}' is not one of doc 03's five classes`);
  }
  if (!field(e, 'owner')) {
    failures.push(`${e.id} names no owner — 'unowned — <what>' is a valid answer`);
  }
  // A CI assertion that claims to be in place must have a check behind it.
  // A pending one is already saying the mechanism does not exist.
  if (cls === 'ci-assertion' && !pending.has(e.id) && !ciCovered.has(e.id)) {
    failures.push(`${e.id} claims enforcement by CI assertion but registers no check`);
  }
  // The rule doc 32 was written for: a check must state what it covers.
  if (enforced.has(e.id) && !ciCovered.has(e.id)) {
    failures.push(`${e.id} has a registered check but no ciScope — state what the job actually asserts`);
  }
}

const held = registered.filter((id) => !pending.has(id));

console.log(`  enforcement point exists: ${held.length}`);
console.log(`  CI check registered:      ${ciCovered.size}`);
console.log(`  pending:                  ${pending.size}`);
console.log(`  registered:               ${registered.length}`);

const supporting = [...ciCovered].filter((id) => pending.has(id));
if (supporting.length) {
  console.log('');
  console.log(`  \x1b[33mCI check but no enforcement point\x1b[0m — the check supports the`);
  console.log(`  guarantee, it does not deliver it: ${supporting.join(' ')}`);
}
if (pending.size) {
  console.log('');
  console.log(`  pending: ${[...pending].join(' ')}`);
}

// ---- the generated map ----
const esc = (t) => String(t ?? '').replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();

/** Shared constants the registry uses instead of repeating a literal. */
const consts = Object.fromEntries(
  [...reg.matchAll(/^const ([A-Z_]+) = '((?:[^'\\]|\\.)*)';/gm)].map((m) => [m[1], m[2]]),
);

/**
 * Read one field for the map. Handles both quote styles — a statement
 * containing an apostrophe is written with double quotes, and silently
 * dropping those is exactly the class of gap this file exists to catch —
 * and resolves a constant reference to its value.
 */
function str(e, name) {
  const q = e.body.match(
    new RegExp(`\\b${name}\\s*:\\s*(?:'((?:[^'\\\\]|\\\\.)*)'|"((?:[^"\\\\]|\\\\.)*)")`),
  );
  if (q) {
    const raw = q[1] ?? q[2];
    return esc(raw.replace(/\\u2019/g, '’').replace(/\\'/g, "'").replace(/\\"/g, '"'));
  }
  const ref = e.body.match(new RegExp(`\\b${name}\\s*:\\s*([A-Z_]+)\\s*,`));
  return ref && consts[ref[1]] ? esc(consts[ref[1]]) : '';
}

for (const e of entries) {
  for (const f of ['statement', 'owner', 'source']) {
    if (!str(e, f)) failures.push(`${e.id}: could not read '${f}' for the map — generator bug`);
  }
}

const lines = [
  '# Enforcement map',
  '',
  '**Generated by `tools/check-invariants.mjs`. Do not edit by hand.**',
  '',
  'Every guarantee, the mechanism that holds it, who owns that mechanism,',
  'what CI actually asserts about this repo, and what is left over.',
  '',
  'Per doc 32: a CI check is not an enforcement point. An invariant can',
  'carry a check and still be unenforced — the check supports the guarantee,',
  'it does not deliver it.',
  '',
  `\`${held.length}\` enforcement points exist · \`${ciCovered.size}\` CI checks · `
    + `\`${pending.size}\` pending · \`${registered.length}\` registered`,
  '',
];

for (const cls of ENFORCEMENT_CLASSES) {
  const group = entries.filter((e) => enumOf(e, 'enforcement') === cls);
  if (!group.length) continue;
  lines.push(`## ${cls}`, '');
  for (const e of group) {
    const isPending = pending.has(e.id);
    lines.push(`### ${e.id} — ${isPending ? '**NOT BUILT**' : 'in place'}`, '');
    lines.push(`> ${str(e, 'statement')}`, '');
    lines.push(`- **owner** — ${str(e, 'owner')}`);
    if (isPending) lines.push(`- **not built** — ${str(e, 'pending')}`);
    lines.push(`- **CI asserts** — ${ciCovered.has(e.id) ? str(e, 'ciScope') : '_nothing_'}`);
    if (field(e, 'residual')) lines.push(`- **residual** — ${str(e, 'residual')}`);
    lines.push(`- **source** — ${str(e, 'source')}`);
    lines.push('');
  }
}

/**
 * Only on a clean run.
 *
 * A failing gate has, by definition, read a registry it does not accept.
 * Writing the map anyway leaves a committed artifact describing code that
 * did not pass — which is the exact failure this file was added to stop.
 * It was also a real bug: the first committed map was generated during a
 * deliberately-broken run and silently omitted I15.
 */
console.log('');
if (failures.length) {
  console.log('  \x1b[33mgate failed — docs/enforcement-map.md left untouched\x1b[0m');
} else {
  writeFileSync(join(ROOT, 'docs/enforcement-map.md'), lines.join('\n'));
  console.log('  wrote docs/enforcement-map.md');
}

console.log('');
if (failures.length) {
  console.error(`\x1b[31m${failures.length} failure(s)\x1b[0m`);
  for (const f of failures) console.error(`  - ${f}`);
  console.error('');
  process.exit(1);
}
console.log('\x1b[32mAll invariant checks passed\x1b[0m\n');
