# @pe/device-store

The personal record. Lives on the phone, encrypted, never transmitted.

Two rules hold everything else up:

1. **Append-only.** A revision inserts a new row. Nothing is ever updated
   in place, because self-delta is reading the history and a rewritten
   history has nothing to compare.
2. **Nothing here reaches the server in readable form.** The only
   account-keyed object on the server is backup ciphertext it cannot read.

Pure logic — this package has no SQLite dependency. It defines the schema,
the migrations and the operations against a minimal `Db` interface, so it
runs in Node under test and against `expo-sqlite` on a device. The driver
is supplied by the caller.
