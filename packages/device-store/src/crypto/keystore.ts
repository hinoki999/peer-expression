/**
 * The database key: where it lives, how it dies.
 *
 * Doc 13 s6. The threat is not a server breach — the history never
 * reaches a server. It is doc 14 s9, the device holder: a parent, a
 * sibling, a partner, a thief, or forensic extraction. A teenager's phone
 * is frequently not exclusively theirs.
 *
 * Two properties carry the weight, and they are separable:
 *
 *   1. The key is held by the platform keystore (Keychain / Android
 *      Keystore), hardware-backed where available, so it is not sitting
 *      in a file beside the database it protects.
 *   2. The key is EXCLUDED FROM CLOUD BACKUP. Without this the first
 *      property is theatre: iCloud or Google Backup carries the key
 *      off-device, and anyone who can restore the backup can read the
 *      history. Doc 13 states it as a requirement precisely because it is
 *      the part that is easy to leave out.
 *
 * The port exists so the logic is testable. Whether a given platform
 * actually honours device-only storage is a property of that platform's
 * adapter, not of this file, and is verified on a device — see I6.
 */

/** Bytes of key material. 256-bit, because the cipher wants 256-bit. */
export const KEY_BYTES = 32;

/** The one entry. A second key would be a second thing to forget to wipe. */
export const DB_KEY_ALIAS = 'pe.device-store.key.v1';

export interface KeyStore {
  /**
   * Implementations MUST store device-only — never synced, never in a
   * cloud backup. On iOS that is `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; on
   * Android it is the Keystore plus `allowBackup: false`, since Android
   * has no per-item backup exclusion.
   */
  set(alias: string, value: string): Promise<void>;
  get(alias: string): Promise<string | null>;
  delete(alias: string): Promise<void>;
}

export interface RandomSource {
  (bytes: number): Uint8Array;
}

/** Hex, because a keystore stores strings and hex survives every transport. */
export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

export function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('keystore: odd-length key material');
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error('keystore: key material is not hex');
    out[i] = byte;
  }
  return out;
}

/** Platform CSPRNG. Never Math.random, which is not one. */
export const systemRandom: RandomSource = (bytes) => {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.getRandomValues) {
    throw new Error('keystore: no CSPRNG available — refusing to generate a key');
  }
  return c.getRandomValues(new Uint8Array(bytes));
};

/**
 * The key for this install, creating it on first run.
 *
 * Deliberately not idempotent about overwriting: if a key exists it is
 * returned unchanged, because generating a new one would strand every row
 * already encrypted under the old one. A lost key is a wiped store, which
 * is the correct outcome but not one to trigger by accident.
 */
export async function getOrCreateDbKey(
  store: KeyStore,
  random: RandomSource = systemRandom,
): Promise<string> {
  const existing = await store.get(DB_KEY_ALIAS);
  if (existing) {
    if (fromHex(existing).length !== KEY_BYTES) {
      throw new Error('keystore: stored key is the wrong length — refusing to use it');
    }
    return existing;
  }
  const fresh = toHex(random(KEY_BYTES));
  await store.set(DB_KEY_ALIAS, fresh);
  return fresh;
}

/**
 * Crypto-erase. Destroying the key makes every encrypted row unreadable
 * immediately, whatever the filesystem does with the blocks afterwards.
 *
 * This is why the wipe in doc 13 s6 can be "fast, obvious, one action":
 * it does not depend on overwriting a file, on the OS honouring a delete,
 * or on flash storage actually releasing the pages — all of which are
 * unreliable. Deleting rows alone is not a wipe; deleting the key is.
 */
export async function destroyDbKey(store: KeyStore): Promise<void> {
  await store.delete(DB_KEY_ALIAS);
}
