import type { CohortBand } from './cohorts.ts';

/**
 * `BAND_SAFETY_RULES` v2 — doc 33 §2, adopted by Atlas (OWN 2).
 *
 * Transcribed, not authored. The vocabulary, the verbs and the band
 * membership are content policy and belong to OWN 2; this file is the
 * machine-readable copy that CL1a and CL1b compare against. A rule
 * invented here to make a check pass would be Atlas's decision arriving
 * as a code change, which is the failure doc 08 names explicitly.
 *
 * Fixed-choice does not make a question safe, which is the thing that is
 * easy to get wrong from the engineering side. Doc 33 §2.2, correcting an
 * earlier claim of its own: no upload path prevents a card from asking
 * *"Have you ever sent someone a private picture?"* — tap-only, no text
 * box, still soliciting the disclosure. The rules govern what a card
 * ASKS, is ABOUT, or ASSUMES, never what a user can type.
 */

/** Which question a rule answers about a card. Doc 33 §2. */
export type RuleClass =
  /** Does the card request this *from the user*? */
  | 'ASK'
  /** Is this what the card is *about*? */
  | 'SUBJECT'
  /** Does the card treat this as ordinary background? */
  | 'ASSUME';

export interface SafetyRule {
  readonly id: RuleId;
  readonly verb: RuleClass;
  readonly statement: string;
}

/**
 * Closed on purpose. CL1b is a set comparison, and an open string type
 * would let a typo'd tag silently satisfy nothing while looking cleared.
 */
export type RuleId =
  | 'R_person_subject'
  | 'R_harm_solicitation'
  | 'R_harm_normalization'
  | 'R_sexual_activity'
  | 'R_appearance_rating'
  | 'R_body_commentary'
  | 'R_identifying_detail'
  | 'R_meetup_coordination'
  | 'R_private_media'
  | 'R_substance'
  | 'R_dating_platform'
  | 'R_adult_setting'
  | 'R_romantic_escalation';

export const SAFETY_RULES: Readonly<Record<RuleId, SafetyRule>> = {
  R_person_subject: {
    id: 'R_person_subject', verb: 'SUBJECT',
    statement: 'A card may not make an identifiable real person its subject.',
  },
  R_harm_solicitation: {
    id: 'R_harm_solicitation', verb: 'ASK',
    statement:
      'A card may not ask the user to disclose self-harm, abuse, immediate danger, ' +
      'victim identity, offender identity, or equivalent D7-prohibited information.',
  },
  R_harm_normalization: {
    id: 'R_harm_normalization', verb: 'ASSUME',
    statement:
      'Actual or plausibly literal self-harm, abuse, disordered eating, dangerous ' +
      'self-neglect, substance dependence, threats, violence, or other ' +
      'self-destructive coping may not be normalized, romanticized, trivialized, ' +
      'or framed as humorous, aspirational, or evidence of affection.',
  },
  R_sexual_activity: {
    id: 'R_sexual_activity', verb: 'ASK',
    statement: 'A card may not ask about personal sexual experience, activity, or history.',
  },
  R_appearance_rating: {
    id: 'R_appearance_rating', verb: 'ASK',
    statement: 'A card may not ask the user to rank, score, or compare people.',
  },
  R_body_commentary: {
    id: 'R_body_commentary', verb: 'SUBJECT',
    statement:
      'Bodies, physical features, and attractiveness may not be the subject of the ' +
      'interaction, even without an explicit rating.',
  },
  R_identifying_detail: {
    id: 'R_identifying_detail', verb: 'ASK',
    statement:
      'A card may not solicit names, schools, precise locations, handles, or other ' +
      'details that could identify a real person.',
  },
  R_meetup_coordination: {
    id: 'R_meetup_coordination', verb: 'ASK',
    statement:
      'A card may not ask the user to arrange, optimize, or coordinate an in-person meeting.',
  },
  R_private_media: {
    id: 'R_private_media', verb: 'ASSUME',
    statement:
      'Exchange of private or intimate images may not be treated as assumed or ordinary context.',
  },
  R_substance: {
    id: 'R_substance', verb: 'ASSUME',
    statement:
      'Alcohol, vaping, cannabis, or other substance use may not be assumed or ' +
      'normalized as social context.',
  },
  R_dating_platform: {
    id: 'R_dating_platform', verb: 'ASSUME',
    statement:
      'Dating-app matching, swiping, hookup mechanics, or adult dating platforms may ' +
      'not be the assumed scenario.',
  },
  R_adult_setting: {
    id: 'R_adult_setting', verb: 'ASSUME',
    statement:
      'Bars, clubs, adult nightlife, and college-party environments may not be the ' +
      'assumed setting.',
  },
  R_romantic_escalation: {
    id: 'R_romantic_escalation', verb: 'ASSUME',
    statement:
      'Escalation beyond expressed romantic interest may not be presumed or encouraged. ' +
      'Interest, awkwardness, signals, crushes and flirting are all in scope.',
  },
};

/**
 * The nine that apply to everyone. Doc 33 §2.1: these form a product-wide
 * floor that holds regardless of whether band assignment is correct.
 */
const PRODUCT_WIDE: readonly RuleId[] = [
  'R_person_subject',
  'R_harm_solicitation',
  'R_harm_normalization',
  'R_sexual_activity',
  'R_appearance_rating',
  'R_body_commentary',
  'R_identifying_detail',
  'R_meetup_coordination',
  'R_private_media',
];

const UNDER_18_EXTRA: readonly RuleId[] = [
  'R_substance',
  'R_dating_platform',
  'R_adult_setting',
];

const B13_15_EXTRA: readonly RuleId[] = ['R_romantic_escalation'];

/**
 * Derived unions, not three flat literals — doc 33 §2.4.
 *
 * Written this way so the ladder is true *by construction*: 13-15 cannot
 * fail to contain everything 16-17 requires, because it is literally
 * built out of it. CL1a then survives as a regression test rather than
 * being the thing holding the property up.
 *
 * Keys use the code's spelling `B18_PLUS`, not the docs' `B18` (doc 35),
 * so these keys and `CohortBand` are the same type.
 */
export const RULES_VERSION = 2;

export const BAND_SAFETY_RULES: Readonly<Record<CohortBand, readonly RuleId[]>> = {
  B18_PLUS: PRODUCT_WIDE,
  B16_17: [...PRODUCT_WIDE, ...UNDER_18_EXTRA],
  B13_15: [...PRODUCT_WIDE, ...UNDER_18_EXTRA, ...B13_15_EXTRA],
};

/** Strictest first — the order the ladder must hold in. */
export const LADDER: readonly CohortBand[] = ['B13_15', 'B16_17', 'B18_PLUS'];

export function isRuleId(v: unknown): v is RuleId {
  return typeof v === 'string' && v in SAFETY_RULES;
}

/**
 * Rules a card must clear for a band but has not. CL1b.
 *
 * The empty-tag trap: a set comparison against an empty `cleared` returns
 * every rule as missing, which is correct — but a comparison written the
 * other way round (is every cleared rule required?) passes trivially for
 * a card with no tags at all. That direction matters, so it is stated:
 * we ask what the BAND requires, never what the card happens to claim.
 */
export function missingRulesFor(
  band: CohortBand,
  cleared: readonly string[],
): RuleId[] {
  const has = new Set(cleared);
  return BAND_SAFETY_RULES[band].filter((r) => !has.has(r));
}
