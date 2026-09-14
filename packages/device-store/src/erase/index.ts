import type { Db } from '../schema/types.ts';
import { destroyDbKey, type KeyStore } from '../crypto/keystore.ts';
import { wipe } from '../answers/index.ts';

/**
 * The wipe doc 13 s6 asks for: "fast, obvious, one action, no account
 * required."
 *
 * Two steps, and the second is the one that makes it true.
 *
 * Deleting rows asks SQLite to mark pages free. It does not overwrite
 * them, the filesystem may not release them, and flash storage
 * frequently keeps the old blocks alive for wear levelling. A forensic
 * read of the device can recover deleted rows, which is precisely the
 * threat in doc 14 s9 — a phone that is not exclusively the teenager's.
 *
 * Destroying the key makes every row unreadable the instant it happens,
 * whatever the storage layer does afterwards. That is the guarantee; the
 * row delete is housekeeping.
 *
 * Order matters. Rows first, while the database is still open under the
 * key it was encrypted with; the key last, because nothing can be read
 * or written afterwards.
 */
export async function eraseDevice(db: Db, keyStore: KeyStore): Promise<void> {
  wipe(db);
  await destroyDbKey(keyStore);
}

/**
 * Erase when the database cannot be opened — a corrupt file, a key that
 * no longer decrypts it, a migration that failed halfway.
 *
 * The user asking to erase their history must never be told "not right
 * now". Destroying the key alone leaves an unreadable file, which is the
 * same outcome for every threat that matters, so this path always
 * succeeds where the full one might not.
 */
export async function eraseKeyOnly(keyStore: KeyStore): Promise<void> {
  await destroyDbKey(keyStore);
}
