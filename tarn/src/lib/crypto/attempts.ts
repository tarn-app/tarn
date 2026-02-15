import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';
import { SALT_KEY } from './keys';

const ATTEMPTS_KEY = 'tarn_attempts';
const THRESHOLD_KEY = 'tarn_threshold';
const SETUP_KEY = 'tarn_setup';

// Default self-destruct threshold
const DEFAULT_THRESHOLD = 7;

// Database file name (must match database.ts)
const DATABASE_NAME = 'tarn.db';

export async function getAttemptCount(): Promise<number> {
  const value = await SecureStore.getItemAsync(ATTEMPTS_KEY);
  return value ? parseInt(value, 10) : 0;
}

export async function incrementAttempts(): Promise<number> {
  const current = await getAttemptCount();
  const newCount = current + 1;
  await SecureStore.setItemAsync(ATTEMPTS_KEY, String(newCount));
  return newCount;
}

export async function resetAttempts(): Promise<void> {
  await SecureStore.setItemAsync(ATTEMPTS_KEY, '0');
}

export async function getThreshold(): Promise<number> {
  const value = await SecureStore.getItemAsync(THRESHOLD_KEY);
  return value ? parseInt(value, 10) : DEFAULT_THRESHOLD;
}

export async function setThreshold(threshold: number): Promise<void> {
  const clamped = Math.max(5, Math.min(15, threshold));
  await SecureStore.setItemAsync(THRESHOLD_KEY, String(clamped));
}

export async function isSetupComplete(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(SETUP_KEY);
  return value === 'complete';
}

export async function markSetupComplete(): Promise<void> {
  await SecureStore.setItemAsync(SETUP_KEY, 'complete');
}

export async function clearAllSecureStorage(): Promise<void> {
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
  await SecureStore.deleteItemAsync(THRESHOLD_KEY);
  await SecureStore.deleteItemAsync(SETUP_KEY);
  await SecureStore.deleteItemAsync(SALT_KEY);
  await SecureStore.deleteItemAsync('tarn_duress');
  // Also clear settings that should be wiped
  await SecureStore.deleteItemAsync('tarn_show_attempts');
  await SecureStore.deleteItemAsync('tarn_post_destruct');
  await SecureStore.deleteItemAsync('tarn_duress_behavior');
  await SecureStore.deleteItemAsync('tarn_screenshot_protection');
  // Clear rekey recovery marker
  await SecureStore.deleteItemAsync('tarn_rekey_in_progress');
  // Clear data retention setting
  await SecureStore.deleteItemAsync('tarn_retention_months');
}

// Handles iOS reinstall: Keychain persists across uninstall but database doesn't.
// If setup was marked complete but DB file is missing, clear Keychain to start fresh.
export async function cleanupOrphanedState(): Promise<boolean> {
  try {
    // Check if setup was marked complete
    const setupComplete = await SecureStore.getItemAsync(SETUP_KEY);
    if (setupComplete !== 'complete') {
      return false; // Not in orphaned state - either fresh install or setup never completed
    }

    // Check if salt exists (indicates previous setup)
    const salt = await SecureStore.getItemAsync(SALT_KEY);
    if (!salt) {
      return false; // No salt means no previous setup
    }

    // Check if database file exists
    const dbFile = new File(Paths.document, 'SQLite', DATABASE_NAME);
    if (dbFile.exists) {
      return false; // Database exists, not orphaned
    }

    // Orphaned state detected: Keychain has data but database is missing
    // This happens when app is uninstalled and reinstalled on iOS
    // Clear all Keychain entries to allow fresh setup
    await clearAllSecureStorage();

    return true;
  } catch {
    // If we can't determine state, don't clear anything
    return false;
  }
}
