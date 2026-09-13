import { SafeAreaView, StyleSheet } from 'react-native';
import { EmojiFidelity } from '../src/features/spike/EmojiFidelity';
import { color } from '../src/design/tokens';

/**
 * THROWAWAY BRANCH — the spike is the home screen here.
 *
 * On main this renders the drop. A preview build has no dev menu and no
 * URL bar, so a route nothing links to is unreachable; rather than add
 * navigation the product does not want (section 07: no tab bar, the loop
 * is a finite chain and a tab bar invites escape from it), the spike
 * takes the home slot for the length of this branch.
 *
 * The drop still lives at src/features/drop and is untouched.
 */
export default function Index() {
  return (
    <SafeAreaView style={styles.safe}>
      <EmojiFidelity />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.ground },
});
