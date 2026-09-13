import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Drop } from '../src/features/drop/Drop';
import { EmojiFidelity } from '../src/features/spike/EmojiFidelity';
import { RevealTuner } from '../src/features/spike/RevealTuner';
import { ShareCardExport } from '../src/features/spike/ShareCardExport';
import { color, space, type } from '../src/design/tokens';

/**
 * THROWAWAY BRANCH — a picker, so one build answers three spikes.
 *
 * Spikes 4, 5 and 6 were all unblocked by 3b at the same moment and none
 * depends on another's result, so shipping them one build at a time was
 * three cloud builds where one would do. This is the correction.
 *
 * On main this file renders the drop and nothing else. The picker is not
 * navigation the product wants — section 07 is explicit that the loop is
 * a finite chain and a tab bar invites escape from it — it exists because
 * a preview build has no dev menu and no URL bar, and an unlinked route
 * is unreachable.
 */

type Screen = 'menu' | 'emoji' | 'reveal' | 'share' | 'drop';

const ITEMS: { key: Screen; n: string; title: string; sub: string }[] = [
  { key: 'emoji',  n: '4', title: 'Emoji fidelity',  sub: 'sizing, and fallback inside the bundled face' },
  { key: 'reveal', n: '5', title: 'Reveal',          sub: 'tune the beats here, not in a rebuild' },
  { key: 'share',  n: '6', title: 'Share card',      sub: 'export 4:5 and 9:16, check the type and the glyph' },
  { key: 'drop',   n: '—', title: 'The drop',        sub: 'the loop, now with the voice line' },
];

export default function Index() {
  const [screen, setScreen] = useState<Screen>('menu');

  return (
    <SafeAreaView style={styles.safe}>
      {screen === 'menu' ? (
        <View style={styles.menu}>
          <Text style={styles.title}>Spikes</Text>
          <Text style={styles.intro}>
            One build, three spikes. Findings land in docs/spikes; this branch
            never merges.
          </Text>
          {ITEMS.map((i) => (
            <Pressable key={i.key} style={styles.item} onPress={() => setScreen(i.key)}>
              <Text style={styles.itemNum}>{i.n}</Text>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{i.title}</Text>
                <Text style={styles.itemSub}>{i.sub}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.wrap}>
          <Pressable style={styles.back} onPress={() => setScreen('menu')} hitSlop={8}>
            <Text style={styles.backText}>← spikes</Text>
          </Pressable>
          {screen === 'emoji' ? <EmojiFidelity /> : null}
          {screen === 'reveal' ? <RevealTuner /> : null}
          {screen === 'share' ? <ShareCardExport /> : null}
          {screen === 'drop' ? <Drop /> : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.ground },
  wrap: { flex: 1 },
  menu: { flex: 1, padding: space[5], gap: space[4] },
  title: { ...type.question, color: color.ink },
  intro: { ...type.voice, color: color.dim },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: space[4],
    borderTopWidth: 1, borderTopColor: color.line, paddingVertical: space[4],
  },
  itemNum: { ...type.value, color: color.self, width: 20 },
  itemText: { flex: 1, gap: 2 },
  itemTitle: { ...type.option, color: color.ink },
  itemSub: { ...type.voice, color: color.faint, fontSize: 13, lineHeight: 18 },
  back: {
    paddingHorizontal: space[5], paddingVertical: space[3],
    borderBottomWidth: 1, borderBottomColor: color.line,
  },
  backText: { ...type.label, color: color.dim },
});
