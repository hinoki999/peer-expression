import type { ExpoConfig } from 'expo/config';

/**
 * Written by `eas init`. Paste the id it prints here — a dynamic config
 * cannot be edited by the CLI, so this is the one manual step.
 */
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? ''; // <- paste it between the quotes

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
  extra: { eas: { projectId: EAS_PROJECT_ID } },
};

export default config;
