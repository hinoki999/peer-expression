# Spike 02 — Reveal at 60fps

**Branch:** `spike/reveal-60fps` · **~1 day** · touches no user data

## Why
The reveal is the product. If it doesn't feel right on a cheap Android,
nothing else about the app matters.

## Do
Build the reveal sequence with Reanimated + Skia, no backend, hard-coded
numbers. Profile on a low-end Android — not a flagship, not a simulator.

Sequence: tap + haptic (0ms) → lock (60ms) → bars grow from the user's own
choice (180ms) → value resolves (320ms) → haptic (420ms) → voice line
(560ms) → auto-advance (1400ms).

## Answers
- Does it hold 60fps on low-end hardware?
- **Do the timings feel right?** They were chosen by judgment, not measured.
  Expect to change them. That is the point of doing this with a device in
  your hand rather than arguing about it.
- Does the reduced-motion variant still deliver the payoff?

## Done when
A screen recording, a frame-timing profile, and revised timings written back
into the schematic.
