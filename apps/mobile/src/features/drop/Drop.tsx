import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Card, CardOption, PublishedStatistic } from '@pe/shared';
import { RevealRow } from '../reveal/Reveal';
import { api, DEMO_DROP_DATE } from '../../state/mock';
import { beat, color, space, type } from '../../design/tokens';

type Phase = 'asking' | 'revealed';

/**
 * The daily drop: a finite chain of cards, one tap each, auto-advancing.
 *
 * This is the shell — enough of the loop to measure on a device. The real
 * scheduler, the device store writes and the outbox all land later; what
 * matters here is that the beats are real and the emoji are rendered by
 * the platform rather than drawn.
 */
export function Drop() {
  const [cards, setCards] = useState<Card[]>([]);
  const [options, setOptions] = useState<CardOption[]>([]);
  const [stats, setStats] = useState<PublishedStatistic[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('asking');
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    // Scope is not sent — the band derives server-side from the signed
    // assertion (I7). The mock keys on date alone for the same reason.
    api.getDrop({ dropDate: DEMO_DROP_DATE }).then((d) => {
      setCards([...d.cards]);
      setOptions([...d.options]);
      setStats([...d.statistics]);
    });
  }, []);

  const card = cards[index];
  const cardOptions = card ? options.filter((o) => o.cardId === card.cardId) : [];
  const stat = card ? stats.find((s) => s.cardId === card.cardId) : undefined;

  /**
   * Every timer this card scheduled. `phase !== 'asking'` guards a second
   * tap on the same card; it does not guard the timers, which outlive the
   * component unless something clears them.
   *
   * Left uncleared they fire after unmount, backgrounding or a fast
   * navigation — setting state on a dead component, and stacking
   * `setIndex(i => i + 1)` calls if more than one is in flight. On a slow
   * device that reads as "the drop skipped two cards": rare, hard to
   * reproduce, easy to blame on the wrong thing. It would also corrupt the
   * 60fps spike's measurements.
   */
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const choose = useCallback((optionId: string) => {
    if (phase !== 'asking') return;
    clearTimers();
    // Haptic fires with the tap, not after it.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setChosen(optionId);
    setPhase('revealed');
    after(beat.reveal - beat.lock, () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    });
    after(beat.advance, () => {
      setIndex((i) => i + 1);
      setChosen(null);
      setPhase('asking');
    });
  }, [phase, clearTimers, after]);

  if (!card) {
    return (
      <View style={styles.done}>
        <Text style={styles.doneTitle}>That's today.</Text>
        <Text style={styles.doneBody}>
          {cards.length === 0 ? 'Loading…' : 'Come back tomorrow for a new set.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.counter}>
        {index + 1} / {cards.length}
      </Text>

      <Text style={styles.question} accessibilityRole="header">
        {card.body}
      </Text>

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
              revealed={phase === 'revealed'}
            />
          );
          return phase === 'asking' ? (
            <Pressable
              key={o.optionId}
              onPress={() => choose(o.optionId)}
              accessibilityRole="button"
              accessibilityLabel={o.spokenForm}
              hitSlop={4}
            >
              {row}
            </Pressable>
          ) : (
            <View key={o.optionId}>{row}</View>
          );
        })}
      </View>

      {phase === 'revealed' && !stat ? (
        <Text style={styles.forming}>
          Results are still forming. We'll show the pattern once enough people have answered.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: space[5], paddingTop: space[6], gap: space[5] },
  counter: { ...type.label, color: color.faint, textTransform: 'uppercase' },
  question: { ...type.question, color: color.ink },
  options: { marginTop: space[3] },
  forming: { ...type.voice, color: color.dim },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3], padding: space[6] },
  doneTitle: { ...type.question, color: color.ink },
  doneBody: { ...type.voice, color: color.dim, textAlign: 'center' },
});
