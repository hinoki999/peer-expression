/**
 * CL2's lexical detector — doc 33.
 *
 * The structure is the decision, and it only runs one way:
 *
 *     lexical detector -> flags suspicious cards -> human review queue
 *
 * and never:
 *
 *     no keyword match -> safe card              <- forbidden
 *
 * So this produces WORK ITEMS, not verdicts. It does not gate a merge and
 * it must never be wired to. Doc 33 gives the reason: a pattern list that
 * blocks merges gets tuned until it stops firing, and the failure arrives
 * as a green build.
 *
 * The standing invariant, which survives any improvement to the terms:
 *
 *   > Detector output never constitutes semantic approval.
 *
 * Stated separately because as the detector gets better, a quiet queue
 * starts to feel like evidence of safety. It is evidence about the
 * detector. CL7 is what actually makes review binding; this only decides
 * what gets looked at first.
 *
 * The terms below are a starting list derived from the D7 RED categories
 * in doc 03. They are MECHANISM, and tuning them is OWN 2's call — a term
 * removed here does not make a card safe, it makes it unflagged.
 */

export interface DetectorTerm {
  readonly pattern: RegExp;
  /** Which prohibited category this is reaching for. */
  readonly category: string;
}

export const DETECTOR_TERMS: readonly DetectorTerm[] = [
  { category: 'self-harm', pattern: /\b(kill myself|end it all|self[- ]harm|cutting myself|suicid\w*)\b/i },
  { category: 'self-harm idiom', pattern: /\b(i'?m dead|die inside|kill(ed)? me|stop breathing|i need to lie down|can'?t breathe)\b/i },
  { category: 'disordered eating', pattern: /\b(haven'?t eaten|skip(ping)? meals?|starv\w+|purg\w+|calories)\b/i },
  { category: 'abuse', pattern: /\b(abus\w+|hit me|hurt me|threaten\w*|assault\w*)\b/i },
  { category: 'immediate danger', pattern: /\b(unsafe|in danger|scared of (him|her|them)|running away)\b/i },
  { category: 'substance', pattern: /\b(drunk|vap\w+|weed|high|drinking|blackout|hungover)\b/i },
  { category: 'identifying detail', pattern: /\b(your (school|address|last name|number)|what'?s your (snap|insta|handle))\b/i },
  { category: 'meetup', pattern: /\b(meet up|come over|pick you up|where do you live)\b/i },
  { category: 'private media', pattern: /\b(nudes?|private (picture|photo|pic)|send (a )?pic)\b/i },
  { category: 'appearance rating', pattern: /\b(rate|rank|hotter|prettier|out of ten|better looking)\b/i },
];

export interface DetectorFlag {
  readonly cardId: string;
  readonly category: string;
  readonly matched: string;
  readonly where: string;
}

/**
 * Terms found in a card's authored text. A flag is a reason to look, and
 * nothing more — it is not evidence the card is unsafe, and an empty
 * result is not evidence that it is safe.
 */
export function flagCard(card: {
  cardId?: string;
  body?: string;
  voiceLine?: string | null;
  options?: readonly { label?: string | null; spokenForm?: string | null }[];
}): DetectorFlag[] {
  const id = card.cardId ?? '?';
  const fields: [string, string][] = [['body', card.body ?? '']];
  if (card.voiceLine) fields.push(['voiceLine', card.voiceLine]);
  for (const o of card.options ?? []) {
    if (o.label) fields.push([`option "${o.label}"`, o.label]);
    if (o.spokenForm) fields.push([`spokenForm "${o.label ?? '?'}"`, o.spokenForm]);
  }

  const flags: DetectorFlag[] = [];
  for (const [where, text] of fields) {
    for (const t of DETECTOR_TERMS) {
      const m = text.match(t.pattern);
      if (m) flags.push({ cardId: id, category: t.category, matched: m[0], where });
    }
  }
  return flags;
}
