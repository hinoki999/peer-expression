/**
 * The guarantees, as data — and, since doc 32, the attribution for each.
 *
 * A statement alone was not enough. The sweep found the dominant failure
 * was silent scope promotion: a real check described as covering more
 * than it covers. So every entry now names where the guarantee actually
 * holds, who owns that mechanism, what the registered CI check actually
 * asserts, and what is left over.
 *
 * The distinction that matters, and the one that was missing:
 *
 *   `enforcement` — where the guarantee holds in the running system
 *   `ciScope`     — what the CI job asserts about this repo, and no more
 *
 * They are frequently not the same thing, and treating a CI check as the
 * enforcement point is how I7 came to be counted as enforced while the
 * gateway that would enforce it does not exist. An invariant may carry a
 * supporting CI check and still be `pending`.
 *
 * Rationale lives in project docs 00-32; this file is the index, and
 * tools/check-invariants.mjs generates docs/enforcement-map.md from it.
 */

/**
 * Doc 03's five classes. Closed on purpose — a sixth would need Atlas,
 * since the vocabulary is his.
 *
 * Known gap, flagged rather than papered over: there is no class for a
 * device-side cryptographic control. I6's at-rest encryption is stronger
 * than `client-affordance` implies, because it constrains the dishonest
 * path too. It is filed as `client-affordance` with the imprecision
 * stated in its residual, pending a ruling.
 */
export type Enforcement =
  /** Constrains the honest path only. A modified client is not bound. */
  | 'client-affordance'
  /** Rejects a malformed or forbidden request. */
  | 'server-validation'
  /** Unforgeable in transit between named components. */
  | 'signed-assertion'
  /** True of this repo, at the scope the job actually scans. */
  | 'ci-assertion'
  /** A person does it. Names an owner, or says unowned. */
  | 'human-process';

export interface Invariant {
  id: string;
  statement: string;
  /** Where the guarantee holds. Not where a test happens to run. */
  enforcement: Enforcement;
  /** Owner of that mechanism. 'unowned — <what>' is a valid answer. */
  owner: string;
  /** What the registered CI check asserts. Never broader than the job. */
  ciScope?: string;
  /** What the mechanism does not cover. */
  residual?: string;
  test: string;
  source: string;
  /** The enforcement point does not exist yet. Must carry a reason. */
  pending?: string;
}

const BACKEND = 'unowned — backend (doc 08)';
const LIBRARY = 'unowned — card library (doc 08)';
const TS = 'unowned — T&S operations (doc 08)';

export const INVARIANTS: readonly Invariant[] = [
  { id:'I1', statement:"Every card's subject is SELF, SYMBOL, HYPOTHETICAL or AGGREGATE",
    enforcement:'ci-assertion', owner:'Caitie',
    ciScope:'CARD_SUBJECTS is a closed union of four; the taxonomy gate rejects a seed card with any other subject',
    residual:'no server-side submission schema validates subject at runtime; the gate has no cards to walk yet',
    test:'write a fifth subject type -> rejected', source:'doc 04' },

  { id:'I2', statement:'The vote store holds counters, not rows',
    enforcement:'ci-assertion', owner:'Caitie',
    ciScope:'schema definitions in this repo declare no per-vote row, timestamp or account key',
    residual:'the bound database is unbuilt; re-run against the real schema at binding',
    test:'schema audit -> no row, no timestamp, no account key', source:'doc 13 v2' },

  { id:'I3', statement:'The aggregation queue is never durable',
    enforcement:'server-validation', owner:BACKEND,
    test:'storage audit -> in-memory; no archival copy', source:'doc 15 AMD 7',
    pending:'no queue service exists yet — step 14' },

  { id:'I4', statement:'Arrival order does not survive the drain',
    enforcement:'server-validation', owner:BACKEND,
    test:'drain -> order shuffled', source:'doc 15 AMD 7',
    pending:'no queue service exists yet — step 14' },

  { id:'I5', statement:'Personal history never leaves the device readable',
    enforcement:'ci-assertion', owner:'Caitie',
    ciScope:'no contract operation declares a parameter or return carrying answer history or a flirtprint',
    residual:'a field absent from a type is not a field absent from a runtime response; the binding must validate',
    test:'contract audit -> no operation carries answer history or a flirtprint', source:'doc 13 v2' },

  { id:'I6', statement:'Local history is encrypted at rest',
    enforcement:'client-affordance', owner:'Caitie',
    residual:'the class is imprecise — encryption constrains the dishonest path too, and doc 03 has no device-control class. An adult with the passcode can still open the app (doc 14 s9), which is a limit of the architecture rather than a gap in it.',
    test:'pull the database file off a device -> no readable card ids, choices or timestamps',
    source:'doc 13 v2 s6',
    pending:'the key lifecycle and backup exclusion are built (I6b); the cipher is not. expo-sqlite cannot encrypt, so this needs the op-sqlite/SQLCipher swap the schematic already anticipates, plus reading the file off a device — which no CI job can do.' },

  { id:'I6b', statement:'The database key is held by the platform keystore and excluded from cloud backup',
    enforcement:'ci-assertion', owner:'Caitie',
    ciScope:'the keystore adapter passes WHEN_UNLOCKED_THIS_DEVICE_ONLY on every call and no other accessibility value, and app.config.ts sets android.allowBackup false',
    residual:'asserts the configuration, not the platform behaviour. That iOS honours device-only for Keychain items, and that Android excludes the app from Google Backup, are Apple and Google guarantees — verified by restoring a backup onto a second device, a human process nobody has run. allowBackup is app-wide, so an unrelated config change can silently drop it; this check is what makes that loud.',
    test:'restore a device backup onto a second device -> the key is absent',
    source:'doc 13 v2 s6, doc 14 s9' },

  { id:'I7', statement:'No account receives authored content or statistics computed from another band',
    enforcement:'server-validation', owner:BACKEND,
    ciScope:'no read operation in the contract accepts a client-supplied scope',
    residual:'the contract check constrains the declared surface only. The guarantee is a runtime property of the vote gateway, which must derive scope from the signed assertion and reject anything else.',
    test:'gateway rejects a read whose scope was not derived from the signed assertion', source:'doc 16 F6, doc 25 F2, doc 32 C3',
    pending:'the vote gateway does not exist — step 14' },

  { id:'I8', statement:'No observable result transition attributable to one participant',
    enforcement:'server-validation', owner:BACKEND,
    test:'single response never changes a displayed value', source:'doc 15 Part C',
    pending:'runtime property of the mill — step 14' },

  { id:'I9', statement:'No publication below MIN_CELL_PUBLIC',
    enforcement:'server-validation', owner:BACKEND,
    test:'under threshold -> "results are still forming"', source:'doc 15 Part C',
    pending:'needs the publication path — step 14' },

  { id:'I10', statement:'Publication gates on batch contents, not schedule',
    enforcement:'server-validation', owner:BACKEND,
    test:'batch under MIN_BATCH_DELTA -> holds', source:'doc 15 AMD 5',
    pending:'needs the publication path — step 14' },

  { id:'I11', statement:'A vote never deterministically triggers a visible update',
    enforcement:'server-validation', owner:BACKEND,
    ciScope:'VoteAccepted declares no statistic field',
    residual:'the contract cannot stop a publication path from updating on receipt; that is the mill’s behaviour',
    test:'contract audit -> VoteAccepted carries no statistic', source:'doc 15 Part E',
    pending:'needs the publication path — step 14' },

  { id:'I12', statement:"The user's own reveal shows the last published snapshot",
    enforcement:'server-validation', owner:BACKEND,
    ciScope:'no pending/counted distinction is expressible in the contract types',
    residual:'a field absent from a type is not a field absent from a JSON response (doc 32); the server must not ship one',
    test:'response body carries no pending/counted distinction', source:'doc 15 AMD 8, doc 32',
    pending:'no server ships responses yet — lands with the binding' },

  { id:'I13', statement:'Display normalized; no sample size, numerator, decimals, timestamps',
    enforcement:'server-validation', owner:BACKEND,
    ciScope:'contract types expose no sample size, numerator or decimal precision',
    residual:'covers contract types, not client-rendered strings (doc 32). If the server ships true numbers and the client rounds, a modified client reads the exact figure.',
    test:'response body carries no exact figure', source:'doc 15 Part C, doc 32',
    pending:'no server ships responses yet — lands with the binding' },

  { id:'I14', statement:'Cohort fallback is sticky and never oscillates',
    enforcement:'server-validation', owner:BACKEND,
    test:'no flip until 1.5x MIN_CELL', source:'doc 15 AMD 4',
    pending:'needs the publication path — step 14' },

  { id:'I15', statement:'Cohorts predetermined; no arbitrary slicing',
    enforcement:'ci-assertion', owner:'Caitie',
    ciScope:'PublicationScope is a closed union of the known bands plus the one global scope',
    residual:'a server could still compute an unlisted slice internally; the union constrains what our code can name',
    test:'PublicationScope is a closed union of known bands plus the one global scope', source:'doc 15 Part C' },

  { id:'I16', statement:'Local history is append-only; a revision inserts and never overwrites',
    enforcement:'ci-assertion', owner:'Caitie',
    ciScope:'the answers module exports no update path and no UPDATE against answer_local',
    residual:'a modified client can write to the SQLite file directly; this binds our own code, not the device',
    test:'device-store exports no update path; revision inserts', source:'doc 16 F1' },

  { id:'I16b', statement:'A conforming client emits at most one aggregate contribution per card, however often the answer is revised',
    enforcement:'client-affordance', owner:'Caitie',
    ciScope:'the outbox enforces it three ways — an enqueue guard, a unique partial index on queued votes, and a vote_sent marker that outlives the drain',
    residual:'ACCEPTED RESIDUAL (doc 32 C2). Counters accept any submission bearing a valid single-use assertion. Server-side dedup would require exactly the (account, card) ledger the architecture refuses, so a modified client can double-count and nothing server-side will stop it.',
    test:'a second VOTE for a queued or already-sent card is refused', source:'doc 16 F1, doc 26 S1, doc 32 C2' },

  { id:'I17', statement:'There is no channel between two users',
    enforcement:'ci-assertion', owner:'Caitie',
    ciScope:'no contract operation accepts a recipient',
    residual:'absence of a feature rather than a control; any new operation re-opens it (doc 14 s2)',
    test:'contract audit -> no operation accepts a recipient', source:'doc 14 s2' },

  { id:'I18', statement:'Authored text never joined to counters',
    enforcement:'server-validation', owner:BACKEND,
    test:'query-path audit', source:'doc 13 v2 s7',
    pending:'no query layer exists yet — lands with the binding' },

  { id:'I19', statement:'Every read of authored text and every trust-path access is logged',
    enforcement:'server-validation', owner:BACKEND,
    test:'view a queue item -> access_log entry', source:'doc 16 F8',
    pending:'no moderation tool or trust path yet — steps 13, 14' },

  { id:'I20', statement:'No model scores a named user, except integrity — and that exception is fenced',
    enforcement:'server-validation', owner:BACKEND,
    test:'prediction subject = account -> rejected', source:'doc 16 F7',
    pending:'no prediction model in the schema yet — step 14' },

  { id:'I21', statement:'No question can require disclosure of harm',
    enforcement:'ci-assertion', owner:LIBRARY,
    test:'card matching D7 RED -> rejected at seed', source:'doc 15 Part A',
    pending:'the taxonomy gate has no cards to walk — step 10' },

  { id:'I22', statement:'Privacy parameters have hard floors configuration cannot cross',
    enforcement:'ci-assertion', owner:'Caitie',
    ciScope:'MIN_CELL_PUBLIC and MIN_BATCH_DELTA are compared against their floors in this repo',
    residual:'a deployed service could read a threshold from configuration the gate never sees',
    test:'MIN_BATCH_DELTA < 20 or MIN_CELL_PUBLIC < 500 -> build fails', source:'doc 16 F4' },

  { id:'I23', statement:'No account-level score outlives the data that produced it',
    enforcement:'server-validation', owner:BACKEND,
    test:'expire flags -> weight_tier returns to baseline', source:'doc 18 O2',
    pending:'no integrity store yet — step 14' },

  { id:'I24', statement:'A creator sees only the milestone, never the exact usage count',
    enforcement:'server-validation', owner:BACKEND,
    ciScope:'UsageMilestone exposes no count, and no per-format authenticated lookup exists in the contract',
    residual:'the endpoint must return a bucket; no integer may exist in any response (doc 19 R3, doc 32)',
    test:'response body carries no usage integer', source:'doc 19 R3, doc 25 F3, doc 32',
    pending:'no server ships responses yet — lands with the binding' },

  { id:'I25', statement:'Appeals and support accept no free text',
    enforcement:'server-validation', owner:TS,
    test:'contract audit -> reason codes and categories only', source:'doc 17',
    pending:'no appeal or support types yet — step 12' },

  { id:'I26', statement:'A cross-band statistic is never presented as peer data',
    enforcement:'ci-assertion', owner:'Caitie',
    ciScope:'the global scope label differs from every band label in SCOPE_LABEL',
    residual:'client copy elsewhere could still imply peer data; the check covers the label table only',
    test:'the global scope label differs from every band label', source:'doc 18 O1' },

  { id:'I27', statement:'Formative test responses never become production statistics',
    enforcement:'human-process', owner:'Caitie',
    test:'step 11 build writes to an isolated store', source:'doc 20',
    pending:'no prototype build target yet — step 11' },

  { id:'I28', statement:'No two vote submissions share a trust-assertion key binding',
    enforcement:'signed-assertion', owner:BACKEND,
    test:'a full drop -> twelve distinct key bindings', source:'doc 21 T1',
    pending:'needs the issuer — step 14' },

  { id:'I29', statement:'The Integrity Authority’s own store holds no account-to-key-fingerprint association',
    enforcement:'ci-assertion', owner:BACKEND,
    residual:'SPLIT PER DOC 32. The original wording was a universal negative over logs, backups, traces and error reports, which no CI assertion can cover. CI can assert the absence of the column; everything else is a named periodic review with an owner. App Attest and Play Integrity keys are a different class and ARE durably retained — they never cross the gateway (doc 31 s5).',
    test:'issuer schema declares no account-to-fingerprint column', source:'doc 21 T2, doc 31 s5, doc 32',
    pending:'needs the issuer — step 14' },

  { id:'I31', statement:'Card content uses only emoji sequences the manifest permits',
    enforcement:'ci-assertion', owner:'Caitie (the gate) \u2014 manifest contents unowned with the card library (doc 08)',
    ciScope:'every emoji sequence in a seed card body or option, and every emoji in a registered mock card source, is present in SUPPORTED_EMOJI_SEQUENCES',
    residual:'the manifest is provisional until step 4 runs on a device. A sequence can render on the two devices tested and still fail on an OEM font neither covered \u2014 doc 06 v2 s3. The gate constrains content, it does not verify rendering.',
    test:'a card using an unlisted sequence -> build fails', source:'doc 06 v2 s6, doc 29, doc 32' },

  { id:'I30', statement:'The cohort band is signed by our Integrity Authority, never accepted from the client',
    enforcement:'signed-assertion', owner:BACKEND,
    ciScope:'no contract operation accepts a client-supplied band',
    residual:'holds only once the vote gateway verifies the assertion signature AND rejects submissions whose band is absent, unsigned, or disagrees with the signed one. That step is specified nowhere (doc 32 C3). The platform does not sign the age response; we do (doc 31 s3).',
    test:'gateway rejects a vote whose band is absent, unsigned, or disagrees with the assertion', source:'doc 21 T3, doc 31, doc 32 C3',
    pending:'the gateway’s assertion verification does not exist — doc 32 C3' },
];

export const PENDING = INVARIANTS.filter((i) => i.pending);
export const ENFORCEABLE = INVARIANTS.filter((i) => !i.pending);
/** Has a CI check, whether or not the enforcement point exists. */
export const CI_COVERED = INVARIANTS.filter((i) => i.ciScope);
