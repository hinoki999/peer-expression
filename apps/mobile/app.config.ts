import type { ExpoConfig } from 'expo/config';

/**
 * From `eas init` — https://expo.dev/accounts/hirule/projects/peer-expression
 *
 * A dynamic config cannot be written by the CLI, so this lives here by
 * hand. It identifies the EAS project a build belongs to; it is not a
 * secret and is safe in the repo.
 */
const EAS_PROJECT_ID = '4947dfcf-c1ed-495b-9c3c-8e645907cb6d';

/**
 * The bundle identifier is the one expensive naming decision — it is
 * effectively permanent once the app is first submitted, because changing
 * it creates a new App Store listing. D2 is still open, so this is a
 * placeholder and must be settled before the first submission.
 */
const config: ExpoConfig = {
  name: 'Peer Expression',
  slug: 'peer-expression',
  /** The EAS account that owns the project. Without it, a build run by a
   *  different signed-in account creates a second project under that name. */
  owner: 'hirule',
  scheme: 'peerexpression',
  version: '0.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  ios: { bundleIdentifier: 'com.hirulelabs.peerexpression', supportsTablet: false },
  android: {
    package: 'com.hirulelabs.peerexpression',
    /**
     * Android has no per-item backup exclusion, so the database key can
     * only be kept out of Google Backup by excluding the whole app.
     *
     * Doc 13 s6 requires the key be excluded from cloud backup, and doc
     * 14 s9 is the reason: a backup that carries the key off-device hands
     * the history to anyone who can restore it. On iOS this is handled
     * per-item by WHEN_UNLOCKED_THIS_DEVICE_ONLY; here it is app-wide.
     *
     * Consequence, and it is the right trade: a user restoring to a new
     * phone starts empty. Doc 13 s6's answer to that is opt-in backup
     * encrypted client-side under a user-held secret, which is not built.
     */
    allowBackup: false,
  },
  plugins: ['expo-router'],
  experiments: { typedRoutes: true },
  extra: { eas: { projectId: EAS_PROJECT_ID } },
};

export default config;
