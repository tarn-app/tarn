import * as SQLite from 'expo-sqlite';

// Default symptoms to seed
const DEFAULT_SYMPTOMS = [
  { id: 'cramps', name: 'Cramps', icon: '', sort: 0 },
  { id: 'headache', name: 'Headache', icon: '', sort: 1 },
  { id: 'backache', name: 'Backache', icon: '', sort: 2 },
  { id: 'bloating', name: 'Bloating', icon: '', sort: 3 },
  { id: 'fatigue', name: 'Fatigue', icon: '', sort: 4 },
  { id: 'mood_low', name: 'Low mood', icon: '', sort: 5 },
  { id: 'mood_high', name: 'High energy', icon: '', sort: 6 },
  { id: 'acne', name: 'Acne', icon: '', sort: 7 },
  { id: 'breast_tenderness', name: 'Breast tenderness', icon: '', sort: 8 },
  { id: 'nausea', name: 'Nausea', icon: '', sort: 9 },
  { id: 'insomnia', name: 'Insomnia', icon: '', sort: 10 },
  { id: 'appetite_change', name: 'Appetite change', icon: '', sort: 11 },
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Create meta table if not exists (used to track schema version)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Get current schema version
  const result = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM meta WHERE key = 'schema_version'"
  );
  const currentVersion = result ? parseInt(result.value, 10) : 0;

  // Run migrations sequentially
  if (currentVersion < 1) {
    await migrateV1(db);
  }

  if (currentVersion < 2) {
    await migrateV2(db);
  }

  // Add future migrations here:
  // if (currentVersion < 3) { await migrateV3(db); }
}

async function migrateV1(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    -- Entries table: one row per day
    CREATE TABLE IF NOT EXISTS entries (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL UNIQUE,
      flow        INTEGER DEFAULT 0,
      temp        REAL,
      mucus       INTEGER DEFAULT 0,
      symptoms    TEXT DEFAULT '[]',
      note        TEXT DEFAULT '',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);

    -- Symptoms table: customizable symptom list
    CREATE TABLE IF NOT EXISTS symptoms (
      id    TEXT PRIMARY KEY,
      name  TEXT NOT NULL,
      icon  TEXT DEFAULT '',
      sort  INTEGER DEFAULT 0
    );
  `);

  // Seed default symptoms
  for (const symptom of DEFAULT_SYMPTOMS) {
    await db.runAsync(
      'INSERT OR IGNORE INTO symptoms (id, name, icon, sort) VALUES (?, ?, ?, ?)',
      [symptom.id, symptom.name, symptom.icon, symptom.sort]
    );
  }

  // Update schema version
  await db.runAsync(
    "INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)",
    ['1']
  );
}

async function migrateV2(db: SQLite.SQLiteDatabase): Promise<void> {
  // Create join table for entry symptoms
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS entry_symptoms (
      entry_date TEXT NOT NULL,
      symptom_id TEXT NOT NULL,
      PRIMARY KEY (entry_date, symptom_id)
    );
    CREATE INDEX IF NOT EXISTS idx_entry_symptoms_date ON entry_symptoms(entry_date);
  `);

  // Migrate existing JSON symptom data into the join table
  const rows = await db.getAllAsync<{ date: string; symptoms: string }>(
    "SELECT date, symptoms FROM entries WHERE symptoms != '[]' AND symptoms IS NOT NULL"
  );

  for (const row of rows) {
    let symptomIds: string[];
    try {
      symptomIds = JSON.parse(row.symptoms);
    } catch {
      continue;
    }
    for (const symptomId of symptomIds) {
      await db.runAsync(
        'INSERT OR IGNORE INTO entry_symptoms (entry_date, symptom_id) VALUES (?, ?)',
        [row.date, symptomId]
      );
    }
  }

  // Drop the old symptoms JSON column by recreating the table
  // SQLite doesn't support DROP COLUMN before 3.35.0
  await db.execAsync(`
    CREATE TABLE entries_new (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL UNIQUE,
      flow        INTEGER DEFAULT 0,
      temp        REAL,
      mucus       INTEGER DEFAULT 0,
      note        TEXT DEFAULT '',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
    INSERT INTO entries_new (id, date, flow, temp, mucus, note, created_at, updated_at)
      SELECT id, date, flow, temp, mucus, note, created_at, updated_at FROM entries;
    DROP TABLE entries;
    ALTER TABLE entries_new RENAME TO entries;
    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
  `);

  await db.runAsync(
    "INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)",
    ['2']
  );
}
