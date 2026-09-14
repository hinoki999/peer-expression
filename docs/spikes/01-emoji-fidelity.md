# Spike 01 — Emoji fidelity

**Branch:** `spike/emoji-fidelity` (throwaway) · **CLOSED 2026-09-14**
**Scope narrowed by doc 28**, accepted after the proposal in doc 28 Part B.

---

## What this spike became

The original brief asked three questions. Two were relocated and one was
replaced:

| Original | Where it went |
|---|---|
| Do RN emoji match iMessage and Snapchat? | Replaced. Not falsifiable as posed — we do not control those pipelines, and divergence can come from fallback, weight, line height, baseline metrics, text scaling, variation selectors, ZWJ handling or OEM emoji versions (doc 29). Replaced with the bundled-face question below. |
| Does any glyph fall back to a box? | Step 10. Not answerable without a card library, which has no owner (doc 08). Enforced instead by the manifest, below. |
| Does it hold inside a Skia surface? | Step 6. It was always step 6's subject — *"share-card export, bundled type + composited emoji."* The step 4 brief duplicated it. |

What remained: **emoji at real sizes on real devices — sizing, optical
alignment, and whether inline emoji survive inside a bundled display
face.** Output is a token decision. Dependency (3b) and dependent (step 8)
unchanged.

## Method

A dev-only screen rendering every manifest sequence and every candidate
three ways: option-glyph size in the system face, inline in body copy in
the system face, and inline in body copy in a **bundled** display face
(Space Grotesk, standing in). Codepoints printed above each row so a
missing glyph could be named rather than described.

**Devices:** one Android (preview build, release mode) and one iPhone
(Expo Go, development mode). Observed by Caitie, 2026-09-14.

---

## Findings

### F1 — Inline emoji survive the bundled display face. Doc 28's concern is closed.

Doc 28 found the hole in the narrowing: the claim *"there is no code path
by which they could differ"* held for emoji in a plain system-font `Text`
node and was **not established** for emoji inside a text run styled with
a bundled face, where the renderer must fall back to the system emoji
font for those codepoints. On Android that fallback has historically been
the flakiest part of custom-font handling.

**Observed: in every block, on both platforms, the emoji rendered
identically across all three rows.** No glyph went missing, blanked, or
changed drawing when the surrounding text switched to the bundled face.

**Consequence: no token change.** The contingency — moving emoji into
their own `Text` node with no `fontFamily`, as option glyphs already do —
is not needed. It stays documented as the fix if the real display face
behaves differently.

### F2 — Platform inheritance holds on iOS.

Glyphs on the iPhone were iOS glyphs: the app inherits the device's
rendering rather than substituting its own. This is the property the
RN-over-Flutter decision was made on (doc 06 v2 §3), observed rather than
assumed.

Doc 06 v2's narrowing stands and is not weakened by this: inheriting the
user's ambient rendering is not the same as parity with any particular
messaging app, and this spike did not test against one.

### F3 — No sizing or alignment changes.

Nothing was reported as too large, too small, or off the baseline at
either the option-glyph size or the question size. `tokens.ts` is
unchanged by this spike.

**This is a weaker finding than F1 and should be read that way.** It
rests on nothing looking wrong during an observation pass, not on a
measurement. Step 8 is where the type scale gets designed, and it should
treat emoji sizing as open rather than settled.

---

## What this does NOT establish

Per the attribution discipline (doc 03), stated rather than left for a
reader to infer:

- **Two devices, one of each.** Android emoji are not one thing — Samsung,
  Google and other OEMs ship different designs, and OEM font substitution
  means "the platform glyph" is a family (doc 06 v2 §3). One Android
  phone is one point in that family.
- **The iPhone ran under Expo Go**, in development mode. Valid for
  glyph rendering, which comes from the OS regardless of host app. Not
  valid for performance.
- **Space Grotesk is a stand-in.** The real display face is an open
  design decision with no entry in doc 03. What transfers is the
  mechanism — a custom `fontFamily` did not break emoji fallback. It must
  be re-run against the real face.
- **No per-glyph audit was performed.** The observation was that all three
  rows matched in every block, which establishes F1. It does not
  independently establish that every candidate rendered rather than every
  candidate rendering the same way in all three rows.

## The candidates stay candidates

`EMOJI_CANDIDATES` — the Unicode 14 additions, the skin-tone modifier,
the ZWJ sequence, the variation-selector case, the keycap and the
regional-indicator pair — are **not** promoted into
`SUPPORTED_EMOJI_SEQUENCES` on the strength of this pass.

The evidence above supports "nothing was noticed"; promotion needs "this
sequence was checked on this device and rendered." The costs are
asymmetric: keeping one out costs expressive range in one card, letting
one in wrongly ships a hollow box to a user whose phone is older than
ours. The card library's owner promotes a sequence deliberately, when a
card needs it.

## What shipped from this spike

- `SUPPORTED_EMOJI_SEQUENCES` — 23 sequences, in `packages/shared`
- `extractEmojiSequences` — sequence-aware, not codepoint-aware
- The taxonomy gate scanning **two** roots, after doc 32 found it was
  reading an empty directory while every emoji in the repo sat in a file
  it never opened
- **I31**, enforced by that gate
- One Unicode 14 glyph removed from a shipped mock, found by the gate on
  its first run
