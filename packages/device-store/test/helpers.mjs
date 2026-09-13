import { DatabaseSync } from 'node:sqlite';

/** Adapts node:sqlite to the Db interface. expo-sqlite adapts the same way. */
export function memoryDb() {
  const db = new DatabaseSync(':memory:');
  return {
    exec: (sql) => db.exec(sql),
    run: (sql, params = []) => { db.prepare(sql).run(...params); },
    all: (sql, params = []) => db.prepare(sql).all(...params),
    get: (sql, params = []) => db.prepare(sql).get(...params),
  };
}
