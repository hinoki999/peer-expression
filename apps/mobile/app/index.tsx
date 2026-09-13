import { SafeAreaView, StyleSheet } from 'react-native';
import { Drop } from '../src/features/drop/Drop';
import { color } from '../src/design/tokens';

/**
 * The drop is the home screen. No tab bar — the loop is a finite,
 * auto-advancing chain, and a persistent tab bar invites escape from it.
 */
export default function Index() {
  return (
    <SafeAreaView style={styles.safe}>
      <Drop />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.ground },
});
