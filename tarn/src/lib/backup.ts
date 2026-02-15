import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { getAllEntries, upsertEntry } from './db/queries';
import { getThreshold } from './crypto/attempts';
import { createExportFile, parseExportFile, ExportPayload } from './crypto/cipher';
import { getOrCreateSalt } from './crypto/keys';
import { secureWipeFile } from './utils/wipe';

async function exportData(keyHex: string): Promise<string> {
  // Gather all entries
  const entries = await getAllEntries();
  const threshold = await getThreshold();

  const payload: ExportPayload = {
    entries: entries.map((e) => ({
      date: e.date,
      flow: e.flow,
      temp: e.temp,
      mucus: e.mucus,
      symptoms: e.symptoms,
      note: e.note,
    })),
    settings: {
      threshold,
    },
  };

  // Include the current salt so import can re-derive the key on any device
  const salt = await getOrCreateSalt();

  // Create encrypted export
  const exportFile = createExportFile(payload, keyHex, salt);
  const fileContent = JSON.stringify(exportFile, null, 2);

  // Write to temp file in cache directory
  const fileName = `tarn-backup-${new Date().toISOString().split('T')[0]}.json`;
  const file = new File(Paths.cache, fileName);

  await file.write(fileContent);

  return file.uri;
}

export async function shareExport(keyHex: string): Promise<boolean> {
  let filePath: string | null = null;
  try {
    filePath = await exportData(keyHex);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Save your encrypted backup',
    });

    // Securely wipe temp file after sharing
    await secureWipeFile(filePath);

    return true;
  } catch (error) {
    // Always attempt secure cleanup, even on failure
    if (filePath) {
      try {
        await secureWipeFile(filePath);
      } catch {
        // Ignore cleanup errors
      }
    }
    if (__DEV__) {
      console.error('Export failed:', error);
    }
    throw error;
  }
}

export async function importData(pin: string): Promise<number> {
  // Pick file
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    throw new Error('No file selected');
  }

  const pickedFile = result.assets[0];

  // Read file content
  const file = new File(pickedFile.uri);
  const fileContent = await file.text();

  // Parse and decrypt — uses salt from the file + PIN to re-derive the key
  const payload = await parseExportFile(fileContent, pin);

  // Import entries
  let imported = 0;
  for (const entry of payload.entries) {
    await upsertEntry({
      date: entry.date,
      flow: entry.flow,
      temp: entry.temp,
      mucus: entry.mucus,
      symptoms: entry.symptoms,
      note: entry.note,
    });
    imported++;
  }

  // Securely wipe the cached copy of the backup file
  await secureWipeFile(pickedFile.uri);

  return imported;
}
