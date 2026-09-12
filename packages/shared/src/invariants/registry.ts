/**
 * The thirty guarantees, as data. Each has a CI job.
 * They run against the mock adapter today and the real binding unchanged.
 * Rationale lives in project docs 00-21; this file is the index.
 */
export interface Invariant {
  id: string;
  statement: string;
  test: string;
  source: string;
}

export const INVARIANTS: readonly Invariant[] = [
  { id:'I1',  statement:"Every card's subject is SELF, SYMBOL, HYPOTHETICAL or AGGREGATE", test:'write a fifth subject type -> rejected', source:'doc 04' },
  { id:'I2',  statement:'The vote store holds counters, not rows', test:'schema audit -> no row, no timestamp, no account key', source:'doc 13 v2' },
  { id:'I3',  statement:'The aggregation queue is never durable', test:'storage audit -> in-memory; no archival copy', source:'doc 15 AMD 7' },
  { id:'I4',  statement:'Arrival order does not survive the drain', test:'drain -> order shuffled', source:'doc 15 AMD 7' },
  { id:'I5',  statement:'Personal history never leaves the device readable', test:'outbound payload audit', source:'doc 13 v2' },
  { id:'I6',  statement:'Local history encrypted; key never reaches cloud backup', test:'inspect a device backup', source:'doc 13 v2 s6' },
  { id:'I7',  statement:'No account receives authored content or statistics computed from another band', test:'auth as band A -> all returns band-A-derived', source:'doc 16 F6' },
  { id:'I8',  statement:'No observable result transition attributable to one participant', test:'single response never changes a displayed value', source:'doc 15 Part C' },
  { id:'I9',  statement:'No publication below MIN_CELL_PUBLIC', test:'under threshold -> "results are still forming"', source:'doc 15 Part C' },
  { id:'I10', statement:'Publication gates on batch contents, not schedule', test:'batch under MIN_BATCH_DELTA -> holds', source:'doc 15 AMD 5' },
  { id:'I11', statement:'A vote never deterministically triggers a visible update', test:'cast one vote -> no publication follows', source:'doc 15 Part E' },
  { id:'I12', statement:"The user's own reveal shows the last published snapshot", test:'no pending/counted distinction on any surface', source:'doc 15 AMD 8' },
  { id:'I13', statement:'Display normalized; no sample size, numerator, decimals, timestamps', test:'contract audit', source:'doc 15 Part C' },
  { id:'I14', statement:'Cohort fallback is sticky and never oscillates', test:'no flip until 1.5x MIN_CELL', source:'doc 15 AMD 4' },
  { id:'I15', statement:'Cohorts predetermined; no arbitrary slicing', test:'ad-hoc cohort request -> rejected', source:'doc 15 Part C' },
  { id:'I16', statement:'Local history append-only with revisions; counters take one contribution and are never revised', test:'revise -> local row inserts, counter unchanged', source:'doc 16 F1' },
  { id:'I17', statement:'There is no channel between two users', test:'contract audit -> no operation accepts a recipient', source:'doc 14 s2' },
  { id:'I18', statement:'Authored text never joined to counters', test:'query-path audit', source:'doc 13 v2 s7' },
  { id:'I19', statement:'Every read of authored text and every trust-path access is logged', test:'view a queue item -> access_log entry', source:'doc 16 F8' },
  { id:'I20', statement:'No model scores a named user, except integrity — and that exception is fenced', test:'prediction subject = account -> rejected', source:'doc 16 F7' },
  { id:'I21', statement:'No question can require disclosure of harm', test:'card matching D7 RED -> rejected at seed', source:'doc 15 Part A' },
  { id:'I22', statement:'Privacy parameters have hard floors configuration cannot cross', test:'MIN_BATCH_DELTA < 20 or MIN_CELL_PUBLIC < 500 -> build fails', source:'doc 16 F4' },
  { id:'I23', statement:'No account-level score outlives the data that produced it', test:'expire flags -> weight_tier returns to baseline', source:'doc 18 O2' },
  { id:'I24', statement:'A creator sees only the milestone, never the exact usage count', test:'surface shows "25+", never 24', source:'doc 19 R3' },
  { id:'I25', statement:'Appeals and support accept no free text', test:'contract audit -> reason codes and categories only', source:'doc 17' },
  { id:'I26', statement:'A cross-band statistic is never presented as peer data', test:'GLOBAL scope -> copy reads "everyone on Peer Expression"', source:'doc 18 O1' },
  { id:'I27', statement:'Formative test responses never become production statistics', test:'step 11 build writes to an isolated store', source:'doc 20' },
  { id:'I28', statement:'No two vote submissions share a trust-assertion key binding', test:'a full drop -> twelve distinct key bindings', source:'doc 21 T1' },
  { id:'I29', statement:'No durable artifact associates an account with its issued key bindings', test:'inspect issuer storage after issuance', source:'doc 21 T2' },
  { id:'I30', statement:'The cohort band is signed, never accepted from the client', test:'vote claiming an unsigned band -> rejected', source:'doc 21 T3' },
];
