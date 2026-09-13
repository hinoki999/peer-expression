/**
 * The thirty guarantees, as data.
 *
 * `pending` marks an invariant with no structural check yet, and says why.
 * CI diffs the checks it actually ran against this list and fails on any
 * gap — so a guarantee is either enforced or visibly owed, never quietly
 * neither. Adding I31 fails the build until someone tests it or marks it
 * pending on purpose.
 *
 * Rationale lives in project docs 00-25; this file is the index.
 */
export interface Invariant {
  id: string;
  statement: string;
  test: string;
  source: string;
  /** No structural check yet. Must carry a reason. */
  pending?: string;
}

export const INVARIANTS: readonly Invariant[] = [
  { id:'I1',  statement:"Every card's subject is SELF, SYMBOL, HYPOTHETICAL or AGGREGATE", test:'write a fifth subject type -> rejected', source:'doc 04' },
  { id:'I2',  statement:'The vote store holds counters, not rows', test:'schema audit -> no row, no timestamp, no account key', source:'doc 13 v2' },
  { id:'I3',  statement:'The aggregation queue is never durable', test:'storage audit -> in-memory; no archival copy', source:'doc 15 AMD 7',
    pending:'no queue service exists yet — step 14' },
  { id:'I4',  statement:'Arrival order does not survive the drain', test:'drain -> order shuffled', source:'doc 15 AMD 7',
    pending:'no queue service exists yet — step 14' },
  { id:'I5',  statement:'Personal history never leaves the device readable', test:'contract audit -> no operation carries answer history or a flirtprint', source:'doc 13 v2' },
  { id:'I6',  statement:'Local history is encrypted; its key never reaches cloud backup', test:'inspect a device backup -> no plaintext, no key material', source:'doc 13 v2 s6',
    pending:'needs the platform keystore — step 7b, blocked on 3b' },
  { id:'I7',  statement:'No account receives authored content or statistics computed from another band', test:'contract audit -> no read operation accepts a client-supplied scope', source:'doc 16 F6, doc 25 F2' },
  { id:'I8',  statement:'No observable result transition attributable to one participant', test:'single response never changes a displayed value', source:'doc 15 Part C',
    pending:'runtime property of the mill — step 14' },
  { id:'I9',  statement:'No publication below MIN_CELL_PUBLIC', test:'under threshold -> "results are still forming"', source:'doc 15 Part C',
    pending:'needs the publication path — step 14' },
  { id:'I10', statement:'Publication gates on batch contents, not schedule', test:'batch under MIN_BATCH_DELTA -> holds', source:'doc 15 AMD 5',
    pending:'needs the publication path — step 14' },
  { id:'I11', statement:'A vote never deterministically triggers a visible update', test:'contract audit -> VoteAccepted carries no statistic', source:'doc 15 Part E' },
  { id:'I12', statement:"The user's own reveal shows the last published snapshot", test:'contract audit -> no pending/counted distinction is expressible', source:'doc 15 AMD 8' },
  { id:'I13', statement:'Display normalized; no sample size, numerator, decimals, timestamps', test:'contract audit', source:'doc 15 Part C' },
  { id:'I14', statement:'Cohort fallback is sticky and never oscillates', test:'no flip until 1.5x MIN_CELL', source:'doc 15 AMD 4',
    pending:'needs the publication path — step 14' },
  { id:'I15', statement:'Cohorts predetermined; no arbitrary slicing', test:'PublicationScope is a closed union of known bands plus the one global scope', source:'doc 15 Part C' },
  { id:'I16', statement:'Local history append-only with revisions; counters take one contribution and are never revised', test:'device-store exports no update path; revision inserts', source:'doc 16 F1' },
  { id:'I17', statement:'There is no channel between two users', test:'contract audit -> no operation accepts a recipient', source:'doc 14 s2' },
  { id:'I18', statement:'Authored text never joined to counters', test:'query-path audit', source:'doc 13 v2 s7',
    pending:'no query layer exists yet — lands with the binding' },
  { id:'I19', statement:'Every read of authored text and every trust-path access is logged', test:'view a queue item -> access_log entry', source:'doc 16 F8',
    pending:'no moderation tool or trust path yet — steps 13, 14' },
  { id:'I20', statement:'No model scores a named user, except integrity — and that exception is fenced', test:'prediction subject = account -> rejected', source:'doc 16 F7',
    pending:'no prediction model in the schema yet — step 14' },
  { id:'I21', statement:'No question can require disclosure of harm', test:'card matching D7 RED -> rejected at seed', source:'doc 15 Part A',
    pending:'needs the taxonomy job and seed cards — step 10' },
  { id:'I22', statement:'Privacy parameters have hard floors configuration cannot cross', test:'MIN_BATCH_DELTA < 20 or MIN_CELL_PUBLIC < 500 -> build fails', source:'doc 16 F4' },
  { id:'I23', statement:'No account-level score outlives the data that produced it', test:'expire flags -> weight_tier returns to baseline', source:'doc 18 O2',
    pending:'no integrity store yet — step 14' },
  { id:'I24', statement:'A creator sees only the milestone, never the exact usage count', test:'contract audit -> UsageMilestone exposes no count, and no per-format lookup exists', source:'doc 19 R3, doc 25 F3' },
  { id:'I25', statement:'Appeals and support accept no free text', test:'contract audit -> reason codes and categories only', source:'doc 17',
    pending:'no appeal or support types yet — step 12' },
  { id:'I26', statement:'A cross-band statistic is never presented as peer data', test:'the global scope label differs from every band label', source:'doc 18 O1' },
  { id:'I27', statement:'Formative test responses never become production statistics', test:'step 11 build writes to an isolated store', source:'doc 20',
    pending:'no prototype build target yet — step 11' },
  { id:'I28', statement:'No two vote submissions share a trust-assertion key binding', test:'a full drop -> twelve distinct key bindings', source:'doc 21 T1',
    pending:'needs the issuer — step 14' },
  { id:'I29', statement:'No durable artifact associates an account with its issued key bindings', test:'inspect issuer storage after issuance', source:'doc 21 T2',
    pending:'needs the issuer — step 14' },
  { id:'I30', statement:'The cohort band is signed, never accepted from the client', test:'vote claiming an unsigned band -> rejected', source:'doc 21 T3' },
];

export const PENDING = INVARIANTS.filter((i) => i.pending);
export const ENFORCEABLE = INVARIANTS.filter((i) => !i.pending);
