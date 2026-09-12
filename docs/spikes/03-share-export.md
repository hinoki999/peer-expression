# Spike 03 — Share-card export

**Branch:** `spike/share-export` · **~1 day** · touches no user data

## Why
The exported card is the growth model, not a feature. If the export is
subtly wrong — wrong font, boxed emoji — nobody will report it and it will
quietly cost installs.

## Do
Render a 4:5 card to PNG with Skia. Bundled display font, not webfont.
Emoji composited from platform text rather than painted.

## Answers
- Does the bundled typeface survive export at full fidelity?
- Do composited emoji land correctly, at the right size and baseline?
- Does 9:16 work from the same renderer?
- File size at the dimensions Snap and TikTok want?

## Done when
Exported PNGs in `docs/spikes/results/03/`, viewed on a phone, not a laptop.
