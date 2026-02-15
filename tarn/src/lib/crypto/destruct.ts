import { closeDatabase, getDatabasePath } from '../db/database';
import { clearAllSecureStorage } from './attempts';
import { secureWipeFile, secureWipeDirectory, getDocumentDirectory, getCacheDirectory } from '../utils/wipe';

export type PostDestructBehavior = 'fresh' | 'error';

// Order matters: clear encryption key FIRST (makes data unreadable even if
// interrupted), then close DB and wipe files, then clean up directories.
export async function executeDestruct(
  behavior: PostDestructBehavior = 'fresh'
): Promise<PostDestructBehavior> {
  // CRITICAL: Clear encryption key FIRST
  // This is the most important step - without the salt, the encrypted
  // database cannot be decrypted even if files remain on disk
  // This should complete even if later steps fail
  try {
    await clearAllSecureStorage();
  } catch {
    // If this fails, we have a serious problem, but continue anyway
  }

  try {
    // 2. Close any open database connection
    await closeDatabase();

    // 3. Get database path and securely wipe
    const dbPath = getDatabasePath();
    if (dbPath) {
      // Wipe all database-related files
      await Promise.all([
        secureWipeFile(dbPath),
        secureWipeFile(`${dbPath}-wal`),
        secureWipeFile(`${dbPath}-shm`),
        secureWipeFile(`${dbPath}-journal`),
      ]);
    }

    // 4. Wipe document directory (any exported files, etc.)
    const docDir = getDocumentDirectory();
    if (docDir) {
      await secureWipeDirectory(docDir);
    }

    // 5. Wipe cache directory
    const cacheDir = getCacheDirectory();
    if (cacheDir) {
      await secureWipeDirectory(cacheDir);
    }
  } catch (error) {
    // File operations failed, but secure storage was already cleared
    // The encryption key is gone, so data is unreadable anyway
  }

  return behavior;
}

export async function manualWipe(): Promise<void> {
  await executeDestruct('fresh');
}
