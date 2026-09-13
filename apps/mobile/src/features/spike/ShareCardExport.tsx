import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Canvas, Rect, LinearGradient, vec } from '@shopify/react-native-skia';
import { useFonts, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { color, space, type } from '../../design/tokens';

/**
 * Spike 3 — share-card export.
 *
 * Section 11: 4:5 and 9:16, "exported as an image, not a link preview",
 * display font bundled in the binary, and emoji "composited from platform
 * text, never painted by Skia."
 *
 * That last constraint is what this file is shaped around, and it is the
 * reason the capture is a view-shot rather than a Skia snapshot.
 * `makeImageSnapshot` would flatten only the canvas — the emoji, which
 * are deliberately NOT on the canvas, would be missing from the export
 * and present on screen. So: Skia paints the ground, React Native draws
 * the type and the glyphs on top, and the whole stack is captured
 * together. Compositing is the mechanism, not a workaround.
 *
 * Spike 1's third question — whether Skia can paint emoji at all — lives
 * here rather than in step 4. It is not answered by this screen; it would
 * need a Skia text node drawing a glyph, and if that ever renders
 * correctly on both platforms, this file gets simpler.
 */

type Ratio = { name: string; w: number; h: number };

/** Rendered at export scale, then captured 1:1. Instagram feed and story. */
const RATIOS: Ratio[] = [
  { name: '4:5', w: 1080, h: 1350 },
  { name: '9:16', w: 1080, h: 1920 },
];

/** On-screen preview width; the capture uses the real pixel size. */
const PREVIEW_W = 260;

function Card({ ratio, scale }: { ratio: Ratio; scale: number }) {
  const w = ratio.w * scale;
  const h = ratio.h * scale;
  return (
    <View style={[styles.card, { width: w, height: h }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={w} height={h}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(w, h)}
            colors={[color.ground, color.surface]}
          />
        </Rect>
      </Canvas>

      <View style={[styles.cardInner, { padding: 56 * scale }]}>
        {/* Emoji: ordinary platform text, above the canvas, never painted. */}
        <Text style={{ fontSize: 140 * scale, lineHeight: 168 * scale }}>👀</Text>

        {/* Type: the bundled face. The whole point of bundling is that this
            renders identically for everyone, which is the opposite of the
            emoji requirement directly above it. */}
        <Text
          style={{
            fontFamily: 'SpaceGrotesk_700Bold',
            fontSize: 64 * scale,
            lineHeight: 74 * scale,
            color: color.ink,
          }}
        >
          6 in 10 read this as flirting
        </Text>

        <Text
          style={{
            fontFamily: 'SpaceGrotesk_700Bold',
            fontSize: 28 * scale,
            lineHeight: 34 * scale,
            color: color.self,
            marginTop: 24 * scale,
          }}
        >
          PEER
        </Text>
      </View>
    </View>
  );
}

export function ShareCardExport() {
  const [loaded] = useFonts({ SpaceGrotesk_700Bold });
  const [results, setResults] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const refs = useRef<Record<string, View | null>>({});

  async function exportOne(ratio: Ratio) {
    const node = refs.current[ratio.name];
    if (!node) return;
    try {
      const uri = await captureRef(node, { format: 'png', quality: 1, result: 'tmpfile' });
      const info = await FileSystem.getInfoAsync(uri);
      const bytes = info.exists && 'size' in info ? info.size : 0;
      setResults((r) => ({
        ...r,
        [ratio.name]: `${ratio.w}×${ratio.h} · ${(bytes / 1024).toFixed(0)} KB`,
      }));
      setPreview(uri);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
    } catch (e) {
      setResults((r) => ({ ...r, [ratio.name]: `failed: ${(e as Error).message}` }));
    }
  }

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <Text style={styles.help}>Loading the display face…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Spike 3 · share card</Text>
      <Text style={styles.help}>
        Skia paints the ground; the type and the emoji are platform text on
        top; the whole stack is captured. Export each, then open the PNG on
        the phone — not on a laptop, where a wrong glyph is easy to miss.
      </Text>

      {RATIOS.map((ratio) => {
        const scale = PREVIEW_W / ratio.w;
        return (
          <View key={ratio.name} style={styles.block}>
            <Text style={styles.section}>{ratio.name}</Text>
            <View
              ref={(n) => { refs.current[ratio.name] = n; }}
              collapsable={false}
            >
              <Card ratio={ratio} scale={scale} />
            </View>
            <Pressable style={styles.button} onPress={() => void exportOne(ratio)}>
              <Text style={styles.buttonText}>export {ratio.name} →</Text>
            </Pressable>
            {results[ratio.name] ? (
              <Text style={styles.result}>{results[ratio.name]}</Text>
            ) : null}
          </View>
        );
      })}

      {preview ? (
        <View style={styles.block}>
          <Text style={styles.section}>last export, read back</Text>
          <Image source={{ uri: preview }} style={styles.preview} resizeMode="contain" />
        </View>
      ) : null}

      <Text style={styles.section}>What to check</Text>
      <Text style={styles.help}>
        Does the bundled typeface survive the export, or fall back to the
        system face? Does the emoji land at the right size and baseline, or
        sit high? Is it a hollow box in the PNG while fine on screen — which
        would mean the capture, not the font, is the problem. File size at
        1080 wide: Snap and TikTok are happy well under 2 MB.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { padding: space[5], paddingBottom: space[7], gap: space[4] },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.ground },
  kicker: { ...type.label, color: color.faint, textTransform: 'uppercase' },
  section: { ...type.label, color: color.faint, textTransform: 'uppercase' },
  block: { gap: space[3], borderTopWidth: 1, borderTopColor: color.line, paddingTop: space[4] },
  card: { overflow: 'hidden', borderRadius: 8 },
  cardInner: { flex: 1, justifyContent: 'flex-end' },
  button: {
    borderWidth: 1, borderColor: color.line, borderRadius: 6,
    paddingVertical: space[3], alignItems: 'center',
  },
  buttonText: { ...type.label, color: color.dim },
  result: { ...type.voice, color: color.self, fontVariant: ['tabular-nums'] },
  preview: { width: PREVIEW_W, height: PREVIEW_W * 1.25, alignSelf: 'center' },
  help: { ...type.voice, color: color.dim },
});
