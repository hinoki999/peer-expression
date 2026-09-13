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
 *
 * Per-option figures are whole percentages, not tenths. At four options
 * "about 1 in 10" can sit beside two visibly different bars, and anything
 * at or below 4% rounds to "0 in 10" next to a drawn bar — the figure
 * contradicting the picture. A screen-reader user loses the distinction
 * entirely, so the coarse form costs the accessible path most. Tenths stay
 * where a single headline figure reads as confident rather than lossy:
 * Discover, and the share card.
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
          ? `${spokenForm}. ${value} out of 100 chose this.${isSelf ? ' Your answer.' : ''}`
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
        {revealed && value !== null ? (
          <Text style={[styles.value, isSelf && styles.labelSelf]}>{`${value}%`}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: space[3], borderRadius: 6, overflow: 'hidden' },
  track: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  fill: { backgroundColor: color.bar },
  fillSelf: { backgroundColor: color.barSelf },
  content: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingVertical: space[4], paddingHorizontal: space[4], minHeight: 56,
  },
  glyph: { fontSize: 26, lineHeight: 32 },
  label: { ...type.option, color: color.ink, flex: 1 },
  labelSelf: { color: color.self },
  value: { ...type.value, color: color.dim },
});
