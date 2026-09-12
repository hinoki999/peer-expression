# mobile

React Native + Expo. Reanimated drives, Skia paints — Skia in exactly two
places, the reveal and the share-card renderer.

**Emoji never appear inside a Skia surface.** They composite from the
platform text renderer, because OS-accurate glyphs were the reason for
React Native in the first place. Verify in the share-export spike before
building on the assumption.

Navigation: the drop is the home screen. No persistent tab bar.
