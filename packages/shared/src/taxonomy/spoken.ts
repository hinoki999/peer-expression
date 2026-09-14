/**
 * CL4 shape — doc 33.
 *
 * VoiceOver reading 👀 as "eyes" destroys the question (doc 12 §12). The
 * spoken form has to carry what the glyph MEANS in the register the card
 * is asking about, not what Unicode calls it.
 *
 * This file checks shape only. Whether the wording actually carries the
 * meaning is CL4 semantic and belongs to OWN 2 — no check reaches it, and
 * doc 33 is explicit that it is the point of the invariant.
 */

/**
 * A bare-glyph option is one whose visible content is just the emoji.
 * Doc 33: the trigger is the option, not the card — a single bare-glyph
 * option inside a card whose other options carry text still counts.
 */
export function isBareGlyphOption(opt: {
  label?: string | null;
  glyph?: string | null;
}): boolean {
  if (!opt.glyph) return false;
  const label = (opt.label ?? '').trim();
  return label === '' || label === opt.glyph.trim();
}

/**
 * Two parts, as doc 33's approved pattern requires: *short identifier +
 * intended social meaning*. Every example in doc 34 is built this way —
 * "Skull — that killed me, meaning I'm laughing."
 *
 * A separator is a PROXY for that structure, not the rule itself. It is
 * the mechanism I chose to make a content rule checkable, and it has a
 * known false positive: a perfectly good spoken form written without one
 * would be rejected. The reviewer resolves that by adding a dash, and the
 * error message says so — a false positive that costs five seconds is the
 * right direction to err when the alternative is "loudly crying face"
 * passing silently.
 */
const TWO_PART = /[—–:,;-]/;

export interface SpokenFormProblem {
  readonly optionId: string;
  readonly problem: string;
}

export function checkSpokenForms(options: readonly {
  optionId: string;
  label?: string | null;
  glyph?: string | null;
  spokenForm?: string | null;
}[]): SpokenFormProblem[] {
  const out: SpokenFormProblem[] = [];
  const seen = new Map<string, string>();

  for (const o of options) {
    const spoken = (o.spokenForm ?? '').trim();

    if (!spoken) {
      out.push({ optionId: o.optionId, problem: 'no spokenForm' });
      continue;
    }

    if (o.glyph && spoken === o.glyph.trim()) {
      out.push({ optionId: o.optionId, problem: 'spokenForm is the glyph itself' });
      continue;
    }

    // Siblings sharing a spoken form make two different answers
    // indistinguishable to a screen reader — the accessible path would
    // offer a choice the user cannot actually make.
    const key = spoken.toLowerCase();
    const twin = seen.get(key);
    if (twin) {
      out.push({
        optionId: o.optionId,
        problem: `spokenForm is identical to option "${twin}" — indistinguishable to a screen reader`,
      });
    } else {
      seen.set(key, o.optionId);
    }

    if (isBareGlyphOption(o) && !TWO_PART.test(spoken)) {
      out.push({
        optionId: o.optionId,
        problem:
          `bare-glyph option reads "${spoken}" — needs identifier + meaning, ` +
          'e.g. "Skull — that killed me, meaning I\'m laughing"',
      });
    }
  }

  return out;
}
