/**
 * Which emoji the card library may use, and how to find them in a string.
 *
 * A manifest, not a version cap. Doc 06 v2: a cap "excludes users to
 * protect a rendering assumption, where a manifest constrains the content
 * instead and costs no reach." Doc 29 accepted the same correction —
 * emoji support is not a scalar, and treating it as one was the error.
 *
 * Raising a minimum OS version to guarantee a glyph renders throws away
 * every user below that line, in a product whose target cohort skews
 * toward older and hand-me-down hardware (doc 29 F3). Constraining the
 * content costs nothing but expressive range, and that is a trade the
 * card library can weigh card by card.
 */

/**
 * Emoji permitted in card bodies and option glyphs.
 *
 * PROVISIONAL. These are conservative choices, not measured ones — step 4
 * has not run on a device yet. A sequence enters this list by surviving
 * that test, and the card library's owner (unassigned, doc 08) decides
 * what is worth testing.
 */
export const SUPPORTED_EMOJI_SEQUENCES: readonly string[] = [
  '\u{1F440}', // 👀 eyes
  '\u{1F62D}', // 😭 loudly crying
  '\u{1F480}', // 💀 skull
  '\u{1F643}', // 🙃 upside-down
  '\u{1F605}', // 😅 sweat smile
  '\u{1F624}', // 😤 steam from nose
  '\u{1F914}', // 🤔 thinking
  '\u{1F633}', // 😳 flushed
  '\u{1F644}', // 🙄 eye roll
  '\u{1F971}', // 🥱 yawning
  '\u{1F979}', // 🥹 holding back tears
  '\u{1F97A}', // 🥺 pleading
  '\u{2728}',  // ✨ sparkles
  '\u{1F525}', // 🔥 fire
  '\u{1F494}', // 💔 broken heart
  '\u{1F91D}', // 🤝 handshake
  '\u{1F44D}', // 👍 thumbs up
  '\u{1F64C}', // 🙌 raising hands
  '\u{1F60F}', // 😏 smirk
  '\u{1F447}', // 👇 down pointing
  '\u{1F9CD}', // 🧍 person standing — Unicode 12, the newest here
  '\u{1F4EC}', // 📬 mailbox with raised flag
  '\u{1F441}\u{FE0F}', // 👁️ eye + VS16 — the selector is part of the
                        // sequence, not decoration. Without it this is
                        // a monochrome text glyph, and the manifest
                        // permits the emoji presentation specifically.
];

/**
 * Sequences step 4 tests on a device. Not permitted until they survive.
 *
 * Deliberately weighted toward the fragile categories — a candidate set
 * of only safe glyphs passes and teaches nothing. Each is here because a
 * different mechanism can break it:
 */
export const EMOJI_CANDIDATES: readonly { seq: string; why: string }[] = [
  { seq: '\u{1FAE0}', why: 'Unicode 14 — melting face, absent on older Android' },
  { seq: '\u{1FAE5}', why: 'Unicode 14 — dotted line face. Was in the mock until the gate caught it.' },
  { seq: '\u{1FAE1}', why: 'Unicode 14 — saluting face' },
  { seq: '\u{1FAE3}', why: 'Unicode 14 — peeking eye' },
  { seq: '\u{1FAF6}', why: 'Unicode 14 — heart hands, a hand shape OEMs redraw' },
  { seq: '\u{1F44B}\u{1F3FD}', why: 'skin-tone modifier — base + Fitzpatrick' },
  { seq: '\u{1F9D1}\u{200D}\u{1F91D}\u{200D}\u{1F9D1}', why: 'ZWJ sequence — the most fragile category' },
  { seq: '\u{263A}\u{FE0F}', why: 'needs VS16 or it renders as monochrome text' },
  { seq: '\u{0023}\u{FE0F}\u{20E3}', why: 'keycap — three codepoints that must not split' },
  { seq: '\u{1F1FA}\u{1F1F8}', why: 'regional indicator pair — some platforms show letters' },
];

/**
 * Anything that makes a cluster an emoji cluster rather than text.
 * A digit is only emoji when a keycap follows it, which is why the
 * keycap mark is tested rather than the digit.
 */
const EMOJI_HINT = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;

/**
 * Whole emoji sequences, in source order.
 *
 * Sequences, not codepoints — this is the entire point. `👋🏽` is two
 * codepoints and one glyph; a family ZWJ sequence is seven codepoints and
 * one glyph. Splitting them compares the wrong things and a manifest
 * check built on codepoints would pass content that renders as three
 * separate people.
 *
 * Intl.Segmenter where present, because it tracks the Unicode rules as
 * they change. The fallback covers the same shapes explicitly for
 * runtimes without it — Hermes has historically shipped a reduced Intl.
 */
export function extractEmojiSequences(text: string): string[] {
  const out: string[] = [];
  const Seg = (globalThis as { Intl?: { Segmenter?: unknown } }).Intl?.Segmenter;

  if (typeof Seg === 'function') {
    const segmenter = new (Seg as new (l?: string, o?: object) => {
      segment(s: string): Iterable<{ segment: string }>;
    })(undefined, { granularity: 'grapheme' });
    for (const { segment } of segmenter.segment(text)) {
      if (EMOJI_HINT.test(segment)) out.push(segment);
    }
    return out;
  }

  const RI = '\\p{Regional_Indicator}';
  const PART = '\\p{Extended_Pictographic}\\uFE0F?\\p{Emoji_Modifier}?';
  const CLUSTER = new RegExp(
    `\\u{1F3F4}[\\u{E0000}-\\u{E007F}]+` +
      `|${RI}${RI}` +
      `|[0-9#*]\\uFE0F?\\u20E3` +
      `|${PART}(?:\\u200D${PART})*`,
    'gu',
  );
  for (const m of text.matchAll(CLUSTER)) out.push(m[0]);
  return out;
}

/** Sequences present in `text` that the manifest does not permit. */
export function unsupportedEmoji(text: string): string[] {
  const allowed = new Set(SUPPORTED_EMOJI_SEQUENCES);
  const seen = new Set<string>();
  const bad: string[] = [];
  for (const seq of extractEmojiSequences(text)) {
    if (allowed.has(seq) || seen.has(seq)) continue;
    seen.add(seq);
    bad.push(seq);
  }
  return bad;
}

/** `👀` -> `U+1F440`. What a tofu box cannot tell you by looking. */
export function describeSequence(seq: string): string {
  return [...seq]
    .map((c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`)
    .join(' ');
}
