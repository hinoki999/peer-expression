import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withTiming, Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { beat, color, motion, space, type } from '../../design/tokens';

interface Props {
  optionId: string;
  label: string;
  glyph: string | null;
  spokenForm: string;
  /** Whole percentage from the last published snapshot, or null while forming. */
  value: number | null;
  isSelf: boolean;
  /** Index in the option list — staggers the bars slightly. */
  order: number;
  revealed: boolean;
}

/**
 * One option row, and its bar.
 *
 * The bar grows from the user's own choice first (doc 05 section 3), and
 * the number shown is the last published snapshot — never recomputed to
 * include this vote (I12). No surface here distinguishes pending from
 * counted, because that distinction is itself a leak.
 *
 * Reduced motion is a variant, not a disabling: the same beats land, with
 * instant state changes instead of tweens, so the payoff still arrives.
 */
export function RevealRow({ label, glyph, spokenForm, value, isSelf, order, revealed }: Props) {
  const reduced = useReducedMotion();
  const fill = useSharedValue(0);

  useEffect(() => {
    if (!revealed || value === null) return;
    const delay = beat.bars + (isSelf ? 0 : 90 + order * 60);
    fill.value = reduced
      ? withDelay(delay, withTiming(value / 100, { duration: 0 }))
      : withDelay(delay, withTiming(value / 100, {
          duration: motion.bars.duration,
          easing: Easing.out(Easing.cubic),
        }));
  }, [revealed, value, isSelf, order, reduced, fill]);

  const barStyle = useAnimatedStyle(() => ({ flex: fill.value }));
  const restStyle = useAnimatedStyle(() => ({ flex: 1 - fill.value }));

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={
        revealed && value !== null
          ? `${spokenForm}. About ${Math.round(value / 10)} in 10 chose this.${isSelf ? ' Your answer.' : ''}`
          : spokenForm
      }
    >
      <View style={styles.track}>
        <Animated.View style={[styles.fill, isSelf && styles.fillSelf, barStyle]} />
        <Animated.View style={restStyle} />
      </View>
      <View style={styles.content}>
        {glyph ? <Text style={styles.glyph}>{glyph}</Text> : null}
        <Text style={[styles.label, isSelf && styles.labelSelf]}>{label}</Text>
        {revealed ? (
          <Text style={[styles.value, isSelf && styles.labelSelf]}>
            {value === null ? '—' : `${Math.round(value / 10)} in 10`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: space[3], borderRadius: 6, overflow: 'hidden' },
  track: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  fill: { backgroundColor: color.bar },
  fillSelf: { backgroundColor: '#1E3A47' },
  content: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingVertical: space[4], paddingHorizontal: space[4], minHeight: 56,
  },
  glyph: { fontSize: 26, lineHeight: 32 },
  label: { ...type.option, color: color.ink, flex: 1 },
  labelSelf: { color: color.self },
  value: { ...type.value, color: color.dim },
});
