# Spike 01 — Emoji fidelity

**Branch:** `spike/emoji-fidelity` · **~1 day** · touches no user data

## Why
Emoji fidelity was the deciding argument for React Native over Flutter. The
product's premise is *"this emoji means X to my generation"* — a glyph that
doesn't match what the user sees in iMessage and Snapchat breaks the claim
the app is making, not just its looks.

## Do
Render the same 30-glyph set in RN on a real iPhone and a real mid-range
Android. Screenshot each beside iMessage and Snapchat showing the same
glyphs.

## Answers
- Do RN-rendered emoji match the messaging apps exactly, on both platforms?
- Any glyph that renders differently, or falls back to a box?
- **Does it still hold inside a Skia surface?** The schematic assumes not,
  and routes emoji around Skia on the share card. If that assumption is
  wrong, the share-card architecture gets simpler.

## Done when
Screenshots in `docs/spikes/results/01/`, and a one-paragraph finding here.
Do not decide from anyone's blog post, including the schematic.
