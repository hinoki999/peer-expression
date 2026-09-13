import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFonts, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import {
  SUPPORTED_EMOJI_SEQUENCES, EMOJI_CANDIDATES, describeSequence,
} from '@pe/shared';
import { color, space, type } from '../../design/tokens';

/**
 * Step 4, the device half. Throwaway — this screen never merges to main
 * (schematic section 03); only the findings and the manifest do.
 *
 * The narrowed step 4 asks three things of a real device, and each row
 * here answers one of them:
 *
 *   1. Sizing and optical alignment at the sizes the app actually uses.
 *   2. Whether an emoji inside a text run styled with a BUNDLED display
 *      face still renders — doc 28's finding, and the reason this screen
 *      loads a font at all. The renderer has to fall back to the system
 *      emoji font for those codepoints, and on Android that fallback has
 *      historically been the flakiest part of custom-font handling.
 *   3. Whether any candidate sequence renders as a hollow box.
 *
 * Space Grotesk is a STAND-IN. The real display face is an open design
 * decision with no entry in doc 03. What transfers from this test is the
 * mechanism — a custom fontFamily either breaks emoji fallback or does
 * not — and it must be re-run against the real face when one is chosen.
 */

const BODY = (glyph: string) => `What does ${glyph} mean when someone sends it?`;

function Row({ seq, note }: { seq: string; note?: string | undefined }) {
  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <Text style={styles.codepoints}>{describeSequence(seq)}</Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>

      {/* 1 — option glyph, system face. What the reveal draws today. */}
      <View style={styles.cell}>
        <Text style={styles.cellLabel}>option · system</Text>
        <Text style={styles.optionGlyph}>{seq}</Text>
      </View>

      {/* 2 — inline in body copy, system face. The current mock. */}
      <View style={styles.cell}>
        <Text style={styles.cellLabel}>body · system</Text>
        <Text style={styles.bodySystem}>{BODY(seq)}</Text>
      </View>

      {/* 3 — inline in body copy, bundled face. Doc 28's hole. If the
          emoji here differs from the row above, or vanishes, fallback is
          the problem and the fix is a token decision: emoji move to their
          own Text node with no fontFamily. */}
      <View style={styles.cell}>
        <Text style={styles.cellLabel}>body · BUNDLED FACE</Text>
        <Text style={styles.bodyBundled}>{BODY(seq)}</Text>
      </View>
    </View>
  );
}

export function EmojiFidelity() {
  const [loaded] = useFonts({ SpaceGrotesk_700Bold });

  const rows = useMemo(
    () => [
      ...SUPPORTED_EMOJI_SEQUENCES.map((seq) => ({ seq, note: undefined as string | undefined })),
      ...EMOJI_CANDIDATES.map((c) => ({ seq: c.seq, note: c.why as string | undefined })),
    ],
    [],
  );

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading the display face…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Step 4 — emoji fidelity</Text>
      <Text style={styles.intro}>
        A hollow box means the glyph is missing on this device. An emoji that
        renders in the system rows but not in the bundled-face row means
        fallback is broken — that is the finding, and the fix is a token
        change, not a content change.
      </Text>
      <Text style={styles.intro}>
        {SUPPORTED_EMOJI_SEQUENCES.length} in the manifest, then{' '}
        {EMOJI_CANDIDATES.length} candidates. Candidates are not permitted
        yet; they are here because each can break a different way.
      </Text>

      <Text style={styles.section}>Manifest</Text>
      {rows.filter((r) => !r.note).map((r) => <Row key={r.seq} seq={r.seq} />)}

      <Text style={styles.section}>Candidates — not yet permitted</Text>
      {rows.filter((r) => r.note).map((r) => (
        <Row key={r.seq} seq={r.seq} note={r.note ?? ''} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { padding: space[5], paddingBottom: space[7], gap: space[4] },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.ground },
  loadingText: { ...type.voice, color: color.dim },
  title: { ...type.question, color: color.ink },
  intro: { ...type.voice, color: color.dim },
  section: {
    ...type.label, color: color.faint, textTransform: 'uppercase',
    marginTop: space[5],
  },
  row: {
    borderTopWidth: 1, borderTopColor: color.line,
    paddingTop: space[3], gap: space[2],
  },
  head: { gap: 2 },
  codepoints: { ...type.label, color: color.self, letterSpacing: 0.6 },
  note: { ...type.voice, color: color.faint, fontSize: 12, lineHeight: 16 },
  cell: { gap: 2 },
  cellLabel: { ...type.label, color: color.faint, fontSize: 10 },
  optionGlyph: { fontSize: 26, lineHeight: 32, color: color.ink },
  bodySystem: { ...type.question, color: color.ink },
  bodyBundled: { ...type.question, color: color.ink, fontFamily: 'SpaceGrotesk_700Bold' },
});
