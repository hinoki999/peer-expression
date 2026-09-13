/**
 * The minimal database surface this package needs. expo-sqlite and
 * better-sqlite3 both satisfy it, and so does the in-memory fake used in
 * tests — so the logic is exercised the same way everywhere.
 */
export interface Db {
  exec(sql: string): void;
  run(sql: string, params?: readonly unknown[]): void;
  all<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): T[];
  get<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): T | undefined;
}

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: string;
}
