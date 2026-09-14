import * as SecureStore from 'expo-secure-store';
import type { KeyStore } from '@pe/device-store';

/**
 * The platform half of doc 13 s6. Keychain on iOS, Android Keystore on
 * Android, hardware-backed where the device has the hardware.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` is doing two jobs and both are
 * required:
 *
 *   WHEN_UNLOCKED — the key is unreachable while the phone is locked, so
 *   a device seized or picked up locked does not yield the history.
 *
 *   THIS_DEVICE_ONLY — the item is excluded from iCloud Keychain and from
 *   encrypted iCloud backups. This is the clause doc 13 names explicitly,
 *   and without it the rest is theatre: the key rides the backup
 *   off-device and anyone who can restore it can read everything.
 *
 * Android has no per-item backup exclusion. The equivalent is
 * `android.allowBackup: false` in app.config.ts, which is app-wide and
 * therefore easy to lose in an unrelated config change. A CI check for it
 * is owed.
 */
export const secureKeyStore: KeyStore = {
  async set(alias, value) {
    await SecureStore.setItemAsync(alias, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      requireAuthentication: false,
    });
  },

  async get(alias) {
    return SecureStore.getItemAsync(alias, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async delete(alias) {
    await SecureStore.deleteItemAsync(alias, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
};
