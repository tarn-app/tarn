import { getDatabase } from './database';
import * as Crypto from 'expo-crypto';

// Types
export interface Entry {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  flow: number; // 0=none, 1=light, 2=medium, 3=heavy
  temp: number | null; // BBT in Celsius (converted to display unit in UI)
  mucus: number; // 0=none, 1=dry, 2=sticky, 3=creamy, 4=egg-white
  symptoms: string[]; // Array of symptom IDs
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface Symptom {
  id: string;
  name: string;
  icon: string;
  sort: number;
}

// Row type returned by SQLite queries
interface EntryRow {
  id: string;
  date: string;
  flow: number;
  temp: number | null;
  mucus: number;
  note: string;
  created_at: string;
  updated_at: string;
}

function mapRowToEntry(row: EntryRow, symptoms: string[]): Entry {
  return {
    id: row.id,
    date: row.date,
    flow: row.flow,
    temp: row.temp,
    mucus: row.mucus,
    symptoms,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getSymptomsForDate(date: string): Promise<string[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{ symptom_id: string }>(
    'SELECT symptom_id FROM entry_symptoms WHERE entry_date = ?', [date]
  );
  return rows.map(r => r.symptom_id);
}

async function getSymptomsForAllEntries(): Promise<Map<string, string[]>> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{ entry_date: string; symptom_id: string }>(
    'SELECT entry_date, symptom_id FROM entry_symptoms ORDER BY entry_date'
  );
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const existing = map.get(row.entry_date);
    if (existing) {
      existing.push(row.symptom_id);
    } else {
      map.set(row.entry_date, [row.symptom_id]);
    }
  }
  return map;
}

// Entry operations

async function getEntry(date: string): Promise<Entry | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<EntryRow>(
    'SELECT * FROM entries WHERE date = ?', [date]
  );
  if (!row) return null;
  const symptoms = await getSymptomsForDate(date);
  return mapRowToEntry(row, symptoms);
}

export async function getAllEntries(): Promise<Entry[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM entries ORDER BY date ASC'
  );
  const symptomMap = await getSymptomsForAllEntries();
  return rows.map(row => mapRowToEntry(row, symptomMap.get(row.date) ?? []));
}

export async function upsertEntry(
  entry: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Entry> {
  const db = getDatabase();
  const now = new Date().toISOString();

  // Check if entry exists
  const existing = await getEntry(entry.date);

  if (existing) {
    // Update
    await db.runAsync(
      `UPDATE entries SET
        flow = ?,
        temp = ?,
        mucus = ?,
        note = ?,
        updated_at = ?
      WHERE date = ?`,
      [
        entry.flow,
        entry.temp,
        entry.mucus,
        entry.note,
        now,
        entry.date,
      ]
    );

    // Replace symptoms in join table
    await db.runAsync('DELETE FROM entry_symptoms WHERE entry_date = ?', [entry.date]);
    await insertSymptoms(db, entry.date, entry.symptoms);

    return {
      ...existing,
      ...entry,
      updatedAt: now,
    };
  } else {
    // Insert
    const id = await generateIdAsync();
    await db.runAsync(
      `INSERT INTO entries (id, date, flow, temp, mucus, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.date,
        entry.flow,
        entry.temp,
        entry.mucus,
        entry.note,
        now,
        now,
      ]
    );

    await insertSymptoms(db, entry.date, entry.symptoms);

    return {
      id,
      ...entry,
      createdAt: now,
      updatedAt: now,
    };
  }
}

export async function deleteEntry(date: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM entry_symptoms WHERE entry_date = ?', [date]);
  await db.runAsync('DELETE FROM entries WHERE date = ?', [date]);
}

export async function deleteEntriesOlderThan(date: string): Promise<number> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM entry_symptoms WHERE entry_date < ?', [date]);
  const result = await db.runAsync('DELETE FROM entries WHERE date < ?', [date]);
  return result.changes;
}

// Symptom operations

export async function getAllSymptoms(): Promise<Symptom[]> {
  const db = getDatabase();
  return db.getAllAsync<Symptom>('SELECT * FROM symptoms ORDER BY sort ASC');
}

export async function addSymptom(name: string): Promise<Symptom> {
  const db = getDatabase();
  const id = `custom_${await generateIdAsync()}`;

  // Get max sort value
  const maxResult = await db.getFirstAsync<{ max_sort: number }>(
    'SELECT MAX(sort) as max_sort FROM symptoms'
  );
  const sort = (maxResult?.max_sort ?? 0) + 1;

  await db.runAsync(
    'INSERT INTO symptoms (id, name, icon, sort) VALUES (?, ?, ?, ?)',
    [id, name, '', sort]
  );

  return { id, name, icon: '', sort };
}

export async function deleteSymptom(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM entry_symptoms WHERE symptom_id = ?', [id]);
  await db.runAsync('DELETE FROM symptoms WHERE id = ?', [id]);
}

// Helpers

async function insertSymptoms(
  db: ReturnType<typeof getDatabase>,
  date: string,
  symptomIds: string[]
): Promise<void> {
  if (symptomIds.length === 0) return;

  const placeholders = symptomIds.map(() => '(?, ?)').join(', ');
  const params = symptomIds.flatMap((id) => [date, id]);
  await db.runAsync(
    `INSERT INTO entry_symptoms (entry_date, symptom_id) VALUES ${placeholders}`,
    params
  );
}

// Cached random bytes for ID generation (refilled when exhausted)
let randomBytesCache: Uint8Array | null = null;
let randomBytesIndex = 0;
const RANDOM_CACHE_SIZE = 256; // Generate 256 bytes at a time

async function generateIdAsync(): Promise<string> {
  // Refill cache if needed
  if (!randomBytesCache || randomBytesIndex >= randomBytesCache.length - 16) {
    randomBytesCache = await Crypto.getRandomBytesAsync(RANDOM_CACHE_SIZE);
    randomBytesIndex = 0;
  }

  // Convert 16 random bytes to hex string
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += randomBytesCache[randomBytesIndex + i].toString(16).padStart(2, '0');
  }
  randomBytesIndex += 16;

  return result;
}

