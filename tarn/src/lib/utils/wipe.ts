import { File, Directory, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';

// Overwrites file with a single pass of random data before deleting.
// One pass is sufficient on flash storage (phones): NAND wear-leveling
// remaps physical blocks on write, so the old data is already in a
// different physical location after the first overwrite. Multiple
// passes only helped on magnetic media. The real protection is that
// destruct.ts clears the encryption key first, making the ciphertext
// unreadable regardless of whether the file wipe completes.
export async function secureWipeFile(filePath: string): Promise<void> {
  try {
    const file = new File(filePath);
    if (!file.exists) return;

    const fileSize = file.size ?? 0;
    const overwriteSize = Math.max(fileSize + 4096, 4096);

    const randomBytes = await Crypto.getRandomBytesAsync(overwriteSize);
    await file.write(randomBytes);

    await file.delete();
  } catch (error) {
    // If overwrite fails, still try to delete
    try {
      const file = new File(filePath);
      if (file.exists) await file.delete();
    } catch {
      // Ignore deletion errors
    }
  }
}

export async function secureWipeDirectory(dirPath: string): Promise<void> {
  try {
    const dir = new Directory(dirPath);

    if (!dir.exists) {
      return;
    }

    const contents = dir.list();

    for (const item of contents) {
      if (item instanceof Directory) {
        await secureWipeDirectory(item.uri);
      } else if (item instanceof File) {
        await secureWipeFile(item.uri);
      }
    }

    // Delete the empty directory
    await dir.delete();
  } catch (error) {
    // Try to delete directory even if wiping fails
    try {
      const dir = new Directory(dirPath);
      if (dir.exists) {
        await dir.delete();
      }
    } catch {
      // Ignore errors
    }
  }
}

export function getDocumentDirectory(): string {
  return Paths.document.uri;
}

export function getCacheDirectory(): string {
  return Paths.cache.uri;
}

