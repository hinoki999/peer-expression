import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withDelay, withTiming, Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { beat, color, motion, type } from '../../design/tokens';

/**
 * The line after the number. Doc 05 section 3:
 *
 *   bars animate out from your choice -> number counts up
 *     -> one line of voice ("apparently none of us can function")
 *     -> next card slides in automatically
 *
 * It lands at beat.voice, which has existed in the tokens since the shell
 * and drove nothing. The token was written and the line was never built.
 *
 * Silence when a card has no line — never a placeholder, never a
 * generated one. A voice line the product wrote itself would be the
 * opposite of personality.
 */
export function VoiceLine({
  line,
  revealed,
  delayMs = beat.voice,
}: {
  line: string | null;
  revealed: boolean;
  delayMs?: number;
}) {
  const reduced = useReducedMotion();
  const enter = useSharedValue(0);

  useEffect(() => {
    if (!revealed || !line) {
      enter.value = 0;
      return;
    }
    enter.value = withDelay(
      delayMs,
      withTiming(1, {
        duration: reduced ? 0 : motion.settle.duration,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [revealed, line, delayMs, reduced, enter]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    // Reduced motion keeps the beat and drops the travel.
    transform: [{ translateY: reduced ? 0 : (1 - enter.value) * 6 }],
  }));

  if (!line) return null;

  return (
    <Animated.View style={style} accessibilityRole="text" accessible>
      <Text style={styles.line}>{line}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  line: { ...type.voice, color: color.dim, fontStyle: 'italic' },
});
