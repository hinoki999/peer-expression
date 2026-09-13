# Spike 02 — Reveal at 60fps

**Branch:** `spike/reveal-60fps` · **OPEN — harness built, not yet run**

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

## Status, 2026-09-14

**The harness exists and the timings are still unvalidated.**

A tuner screen on the spike branch makes every beat adjustable on the
device and prints the values back, so tuning costs a tap rather than a
twenty-minute cloud build per guess.

It was opened and the beats were **left at their defaults**. So the
shipped values remain what they have always been — one person's judgment,
written into `tokens.ts` and never measured:

```
lock 60 · bars 180 · value 320 · reveal 420 · voice 560 · advance 1400
```

Recording that as unvalidated rather than as passed. "Nothing looked
wrong" and "this feels right" are not the same finding, and the
difference matters most for the one mechanic doc 05 §3 calls the core of
the product.

**Frame rate was not measured either.** Deliberately not instrumented
in-app: a JS-thread counter cannot observe the UI thread, and Reanimated
runs the animation there precisely so a busy JS thread cannot stall it —
a counter would report a healthy 60 while the bars stutter. The
instrument is Android's own: Developer options → Profile HWUI rendering →
on screen as bars.

**Neither half has been run on low-end hardware**, which is what the brief
asks for. The device used was not a low-end Android.

## Done when
A screen recording, a frame-timing profile, and revised timings written back
into the schematic.

**Carry into step 9**, which rebuilds the reveal against the mock and is
the natural place to spend a deliberate pass on the beats.
