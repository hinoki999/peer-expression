import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { RevealRow } from '../reveal/Reveal';
import { VoiceLine } from '../reveal/VoiceLine';
import { cards, options, statistics } from '../../state/mock';
import { beat, color, space, type } from '../../design/tokens';

/**
 * Spike 2 — the reveal at 60fps, and whether the beats feel right.
 *
 * The brief says the timings "were chosen by judgment, not measured.
 * Expect to change them. That is the point of doing this with a device in
 * your hand rather than arguing about it."
 *
 * So the beats are adjustable here rather than compiled in. Tuning them
 * in source would cost a twenty-minute cloud build per guess; tuning them
 * on the glass costs a tap, and the numbers that come back are the ones a
 * thumb actually liked. Read the values off the bottom of the screen when
 * it feels right — those go into tokens.ts.
 *
 * Frame rate is NOT measured here. A JS-thread counter cannot see what
 * the UI thread is doing, and Reanimated runs the animation on the UI
 * thread precisely so the JS thread cannot stall it — a counter would
 * report a healthy 60 while the bars stutter. Use Android's own
 * instrument: Developer options -> Profile HWUI rendering -> On screen as
 * bars. Any bar crossing the green line is a dropped frame.
 */

const STEP = 20;

type Beats = {
  lock: number; bars: number; value: number;
  reveal: number; voice: number; advance: number;
};

const INITIAL: Beats = {
  lock: beat.lock, bars: beat.bars, value: beat.value,
  reveal: beat.reveal, voice: beat.voice, advance: beat.advance,
};

const card = cards[0]!;
const cardOptions = options.filter((o) => o.cardId === card.cardId);
const stat = statistics.find((s) => s.cardId === card.cardId);

export function RevealTuner() {
  const [beats, setBeats] = useState<Beats>(INITIAL);
  const [chosen, setChosen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [runs, setRuns] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);
  useEffect(() => clear, [clear]);

  const play = useCallback((optionId: string) => {
    clear();
    setChosen(optionId);
    setRevealed(true);
    setRuns((n) => n + 1);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    timers.current.push(setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, beats.reveal - beats.lock));
  }, [beats, clear]);

  const reset = useCallback(() => {
    clear();
    setRevealed(false);
    setChosen(null);
  }, [clear]);

  const bump = (k: keyof Beats, by: number) =>
    setBeats((b) => ({ ...b, [k]: Math.max(0, b[k] + by) }));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Spike 2 · reveal</Text>

      <Text style={styles.question} accessibilityRole="header">{card.body}</Text>

      <View style={styles.options}>
        {cardOptions.map((o, i) => {
          const value = stat ? stat.normalizedDisplay[o.optionId] ?? null : null;
          const row = (
            <RevealRow
              optionId={o.optionId}
              label={o.label}
              glyph={o.glyph}
              spokenForm={o.spokenForm}
              value={value}
              isSelf={chosen === o.optionId}
              order={i}
              revealed={revealed}
              barsDelayMs={beats.bars}
            />
          );
          return revealed ? (
            <View key={o.optionId}>{row}</View>
          ) : (
            <Pressable key={o.optionId} onPress={() => play(o.optionId)} hitSlop={4}>
              {row}
            </Pressable>
          );
        })}
      </View>

      <VoiceLine line={card.voiceLine} revealed={revealed} delayMs={beats.voice} />

      <Pressable style={styles.replay} onPress={revealed ? reset : undefined}>
        <Text style={styles.replayText}>
          {revealed ? `tap to reset · ${runs} run${runs === 1 ? '' : 's'}` : 'tap an option'}
        </Text>
      </Pressable>

      <Text style={styles.section}>Beats · ms from the tap</Text>
      {(Object.keys(INITIAL) as (keyof Beats)[]).map((k) => (
        <View key={k} style={styles.beatRow}>
          <Text style={styles.beatName}>{k}</Text>
          <Text style={styles.beatValue}>{beats[k]}</Text>
          <Pressable style={styles.step} onPress={() => bump(k, -STEP)}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Pressable style={styles.step} onPress={() => bump(k, STEP)}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      ))}

      <Pressable style={styles.replay} onPress={() => setBeats(INITIAL)}>
        <Text style={styles.replayText}>reset beats to the shipped guesses</Text>
      </Pressable>

      <Text style={styles.section}>Send these back</Text>
      <Text style={styles.readout}>
        {(Object.keys(INITIAL) as (keyof Beats)[])
          .map((k) => `${k}: ${beats[k]},`)
          .join('\n')}
      </Text>

      <Text style={styles.section}>Frame rate</Text>
      <Text style={styles.help}>
        Settings → Developer options → Profile HWUI rendering → On screen as
        bars. Replay the reveal and watch the bars: anything crossing the
        green line is a dropped frame. Do it on the slowest Android you can
        find, not a flagship.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.ground },
  content: { padding: space[5], paddingBottom: space[7], gap: space[4] },
  kicker: { ...type.label, color: color.faint, textTransform: 'uppercase' },
  question: { ...type.question, color: color.ink },
  options: { marginTop: space[2] },
  replay: {
    borderWidth: 1, borderColor: color.line, borderRadius: 6,
    paddingVertical: space[3], alignItems: 'center',
  },
  replayText: { ...type.label, color: color.dim },
  section: {
    ...type.label, color: color.faint, textTransform: 'uppercase',
    marginTop: space[4],
  },
  beatRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderTopWidth: 1, borderTopColor: color.line, paddingVertical: space[2],
  },
  beatName: { ...type.option, color: color.ink, flex: 1 },
  beatValue: {
    ...type.value, color: color.self, minWidth: 56, textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  step: {
    width: 44, height: 44, borderRadius: 6, borderWidth: 1,
    borderColor: color.line, alignItems: 'center', justifyContent: 'center',
  },
  stepText: { ...type.option, color: color.ink },
  readout: {
    ...type.voice, color: color.self, backgroundColor: color.surface,
    padding: space[3], borderRadius: 6, fontVariant: ['tabular-nums'],
  },
  help: { ...type.voice, color: color.dim },
});
