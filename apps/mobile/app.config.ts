import type { ExpoConfig } from 'expo/config';

/**
 * The bundle identifier is the one expensive naming decision — it is
 * effectively permanent once the app is first submitted, because changing
 * it creates a new App Store listing. D2 is still open, so this is a
 * placeholder and must be settled before the first submission.
 */
const config: ExpoConfig = {
  name: 'Peer Expression',
  slug: 'peer-expression',
  scheme: 'peerexpression',
  version: '0.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  ios: { bundleIdentifier: 'com.hirulelabs.peerexpression', supportsTablet: false },
  android: { package: 'com.hirulelabs.peerexpression' },
  plugins: ['expo-router'],
  experiments: { typedRoutes: true },
};

export default config;
