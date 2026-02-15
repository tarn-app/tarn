import * as SQLite from 'expo-sqlite';
import { Paths, File } from 'expo-file-system';
import { runMigrations } from './migrations';

const DATABASE_NAME = 'tarn.db';
const HEX_RE = /^[0-9a-fA-F]+$/;

// Validates hex key and returns it, or throws. Used immediately before
// SQL interpolation so the safety is obvious at the point of use.
function assertHexKey(keyHex: string): string {
  if (!HEX_RE.test(keyHex) || keyHex.length === 0) {
    throw new Error('Invalid key format');
  }
  return keyHex;
}

let db: SQLite.SQLiteDatabase | null = null;
let currentDbPath: string | null = null;

export async function openDatabase(derivedKeyHex: string): Promise<SQLite.SQLiteDatabase> {
  assertHexKey(derivedKeyHex);

  if (db) {
    // Already open - close and reopen with potentially new key
    await closeDatabase();
  }

  // Open database with SQLCipher encryption
  // useNewConnection: true forces a fresh connection instead of using pooled one
  // This is critical for security - without it, a cached authenticated connection
  // could be reused even after locking, allowing any PIN to work
  db = await SQLite.openDatabaseAsync(DATABASE_NAME, { useNewConnection: true });

  // Set the encryption key using PRAGMA
  // SQLCipher expects: PRAGMA key = "x'HEX_KEY'"
  await db.execAsync(`PRAGMA key = "x'${assertHexKey(derivedKeyHex)}'";`);

  // Verify SQLCipher is loaded and the key works
  // First check cipher_version to ensure SQLCipher is available
  let cipherVersion: string | null = null;
  try {
    const result = await db.getFirstAsync<{ cipher_version: string }>(
      'PRAGMA cipher_version;'
    );
    cipherVersion = result?.cipher_version ?? null;
  } catch {
    // Query failed - SQLCipher not available
    db = null;
    throw new Error('SQLCipher not available - rebuild required');
  }

  if (!cipherVersion) {
    // PRAGMA returned null - SQLCipher not loaded
    db = null;
    throw new Error('Database encryption unavailable');
  }

  // Now verify the key by reading from the database
  try {
    await db.execAsync('SELECT count(*) FROM sqlite_master;');
  } catch {
    // Key is wrong - use generic message to not reveal details
    db = null;
    throw new Error('PIN incorrect');
  }

  // Store the path for potential wiping
  const dbFile = new File(Paths.document, 'SQLite', DATABASE_NAME);
  currentDbPath = dbFile.uri;

  // Run migrations to ensure schema is up to date
  await runMigrations(db);

  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not opened. Call openDatabase first.');
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

export function getDatabasePath(): string | null {
  return currentDbPath;
}

async function deleteDatabase(): Promise<void> {
  await closeDatabase();

  const dbFile = new File(Paths.document, 'SQLite', DATABASE_NAME);
  if (dbFile.exists) {
    dbFile.delete();
  }

  // Also delete journal/wal files if they exist
  const walFile = new File(Paths.document, 'SQLite', `${DATABASE_NAME}-wal`);
  const shmFile = new File(Paths.document, 'SQLite', `${DATABASE_NAME}-shm`);
  const journalFile = new File(Paths.document, 'SQLite', `${DATABASE_NAME}-journal`);

  if (walFile.exists) walFile.delete();
  if (shmFile.exists) shmFile.delete();
  if (journalFile.exists) journalFile.delete();

  currentDbPath = null;
}

export async function createDatabase(derivedKeyHex: string): Promise<SQLite.SQLiteDatabase> {
  // Delete any existing database to ensure we start fresh
  await deleteDatabase();
  return openDatabase(derivedKeyHex);
}

export async function rekeyDatabase(newDerivedKeyHex: string): Promise<void> {
  if (!db) {
    throw new Error('Database not opened. Cannot rekey.');
  }

  // SQLCipher PRAGMA rekey re-encrypts the database with the new key
  await db.execAsync(`PRAGMA rekey = "x'${assertHexKey(newDerivedKeyHex)}'";`);
}
