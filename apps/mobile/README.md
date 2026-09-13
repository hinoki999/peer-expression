# mobile

Expo + expo-router. The drop is the home route; there is no tab bar.

## Running it

```sh
pnpm install            # from the repo root
cd apps/mobile
pnpm start              # then scan the QR with Expo Go, or press 'a' for Android
```

## What this is

The shell from step 3b. Enough of the loop to measure on a device:
a card, four options, a tap, the bar reveal, two haptics, auto-advance.

It reads from the **mock adapter**, not a backend. There is no database
binding yet and none is needed.

## What it deliberately does not do

- No writes to the device store. Step 7a exists; wiring it in comes later.
- No encryption. Step 7b, blocked on this shell existing.
- No real card library. The three cards in `src/state/mock.ts` are there
  so the spikes have a realistic emoji load, not as content.

## The constraint that matters here

**Emoji never go inside a Skia surface.** They render through React
Native's own text, so the glyph is the one the OS draws — which is the
reason RN was chosen over Flutter. Skia is for the bar animation and the
share-card renderer, and the two must not overlap. Spike 03 tests this.
