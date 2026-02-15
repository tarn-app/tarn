import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { getOrCreateSalt, deriveKey } from '../crypto/keys';
import { getAttemptCount, incrementAttempts, resetAttempts, getThreshold, isSetupComplete, markSetupComplete, cleanupOrphanedState } from '../crypto/attempts';
import { isDuressPin } from '../crypto/duress';
import { executeDestruct, PostDestructBehavior } from '../crypto/destruct';
import { openDatabase, closeDatabase, rekeyDatabase, createDatabase } from '../db/database';

export type DuressBehavior = 'wipe' | 'hide';

// Simple mutex to prevent race conditions in PIN submission and lock/unlock
let pinSubmitLock = false;
let lockOperationInProgress = false;
let lastAttemptTime = 0;

async function getRateLimitDelay(): Promise<number> {
  const attempts = await getAttemptCount();
  if (attempts === 0) return 0;

  // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
  const delaySeconds = Math.min(Math.pow(2, attempts - 1), 30);
  return delaySeconds * 1000;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SecurityCheckResult =
  | { action: 'duress_wipe' | 'duress_hide' | 'threshold_exceeded' }
  | { action: 'continue'; newAttemptCount: number; threshold: number };

async function runSecurityChecks(
  pin: string,
  salt: string,
  duressBehavior: DuressBehavior,
  postDestructBehavior: PostDestructBehavior,
  set: (partial: Partial<AuthStore>) => void,
): Promise<SecurityCheckResult> {
  // 1. Check duress PIN first (does NOT increment attempt counter)
  const duress = await isDuressPin(pin, salt);
  if (duress) {
    if (duressBehavior === 'wipe') {
      await executeDestruct('fresh');
      set({ state: 'setup', attemptsRemaining: null, derivedKey: null });
      return { action: 'duress_wipe' };
    } else {
      set({ state: 'duress', attemptsRemaining: null });
      return { action: 'duress_hide' };
    }
  }

  // 2. Increment attempt counter FIRST (before expensive key derivation)
  const threshold = await getThreshold();
  const newAttemptCount = await incrementAttempts();

  if (newAttemptCount >= threshold) {
    await executeDestruct(postDestructBehavior);
    set({ state: postDestructBehavior === 'fresh' ? 'setup' : 'destructed', derivedKey: null });
    return { action: 'threshold_exceeded' };
  }

  return { action: 'continue', newAttemptCount, threshold };
}

async function handleWrongPin(
  newAttemptCount: number,
  threshold: number,
  showAttempts: boolean,
  set: (partial: Partial<AuthStore>) => void,
): Promise<AuthResult> {
  let attemptsRemaining: number | null = null;
  if (showAttempts) {
    attemptsRemaining = threshold - newAttemptCount;
  }
  set({ attemptsRemaining });
  return 'WRONG_PIN';
}

type AuthState =
  | 'loading'      // Initial state, checking if setup complete
  | 'setup'        // First-time setup flow
  | 'locked'       // PIN entry required
  | 'unlocked'     // Authenticated, real data
  | 'duress'       // Authenticated, but showing fake empty data
  | 'destructed';  // Data was destroyed

type AuthResult =
  | 'UNLOCKED'
  | 'DURESS_MODE'
  | 'WRONG_PIN'
  | 'DESTRUCTED';

type ChangePinResult = 'SUCCESS' | 'WRONG_CURRENT_PIN' | 'MATCHES_DURESS' | 'ERROR';

interface AuthStore {
  state: AuthState;
  attemptsRemaining: number | null; // null = hidden, number = shown
  showAttempts: boolean;
  postDestructBehavior: PostDestructBehavior;
  duressBehavior: DuressBehavior; // 'wipe' = destroy data, 'hide' = show empty app
  screenshotProtection: boolean; // Prevent screenshots (on by default)
  derivedKey: string | null; // Stored in memory for export/import

  // Actions
  initialize: () => Promise<void>;
  submitPin: (pin: string) => Promise<AuthResult>;
  lock: () => Promise<void>;
  completeSetup: (pin: string) => Promise<void>;
  changePin: (currentPin: string, newPin: string) => Promise<ChangePinResult>;
  verifyPin: (pin: string) => Promise<AuthResult>;
  setShowAttempts: (show: boolean) => void;
  setPostDestructBehavior: (behavior: PostDestructBehavior) => void;
  setDuressBehavior: (behavior: DuressBehavior) => void;
  setScreenshotProtection: (enabled: boolean) => void;
  reset: () => void;
  getDerivedKey: () => string | null;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  state: 'loading',
  attemptsRemaining: null,
  showAttempts: false,
  postDestructBehavior: 'fresh',
  duressBehavior: 'wipe', // Default to wipe for maximum safety
  screenshotProtection: true, // On by default for privacy
  derivedKey: null,

  initialize: async () => {
    try {
      // Check for orphaned Keychain state (iOS reinstall scenario)
      // Must be done BEFORE checking setup complete
      const wasOrphaned = await cleanupOrphanedState();
      if (wasOrphaned) {
        // Orphaned state was cleaned up - treat as fresh install
        set({ state: 'setup' });
        return;
      }

      // Check for interrupted rekey operation and clean up
      const rekeyInProgress = await SecureStore.getItemAsync('tarn_rekey_in_progress');
      if (rekeyInProgress === 'true') {
        // Rekey was interrupted - clean up the markers
        // The user will need to try both their old and new PIN
        // SQLCipher's rekey is atomic, so the DB should be in a valid state
        await SecureStore.deleteItemAsync('tarn_rekey_in_progress');
      }

      const setupComplete = await isSetupComplete();

      if (!setupComplete) {
        set({ state: 'setup' });
        return;
      }

      // Load settings
      const showAttemptsSetting = await SecureStore.getItemAsync('tarn_show_attempts');
      const postDestructSetting = await SecureStore.getItemAsync('tarn_post_destruct');
      const duressSetting = await SecureStore.getItemAsync('tarn_duress_behavior');
      const screenshotSetting = await SecureStore.getItemAsync('tarn_screenshot_protection');

      const showAttempts = showAttemptsSetting === 'true';
      const postDestructBehavior = (postDestructSetting as PostDestructBehavior) || 'fresh';
      const duressBehavior = (duressSetting as DuressBehavior) || 'wipe';
      const screenshotProtection = screenshotSetting !== 'false'; // Default to true

      let attemptsRemaining: number | null = null;
      if (showAttempts) {
        const attempts = await getAttemptCount();
        const threshold = await getThreshold();
        attemptsRemaining = threshold - attempts;
      }

      set({
        state: 'locked',
        showAttempts,
        postDestructBehavior,
        duressBehavior,
        screenshotProtection,
        attemptsRemaining,
      });
    } catch (error) {
      // If anything fails during init, go to setup
      set({ state: 'setup' });
    }
  },

  submitPin: async (pin: string): Promise<AuthResult> => {
    if (pinSubmitLock) {
      return 'WRONG_PIN';
    }
    pinSubmitLock = true;

    try {
      const { showAttempts, postDestructBehavior, duressBehavior } = get();

      // Rate limiting
      const requiredDelay = await getRateLimitDelay();
      const timeSinceLastAttempt = Date.now() - lastAttemptTime;
      if (requiredDelay > 0 && timeSinceLastAttempt < requiredDelay) {
        await delay(requiredDelay - timeSinceLastAttempt);
      }
      lastAttemptTime = Date.now();

      const salt = await getOrCreateSalt();

      const check = await runSecurityChecks(pin, salt, duressBehavior, postDestructBehavior, set);
      if (check.action !== 'continue') {
        if (check.action === 'duress_hide') return 'DURESS_MODE';
        return 'DESTRUCTED';
      }

      const { newAttemptCount, threshold } = check;

      // Try to derive key and open database
      const derivedKey = await deriveKey(pin, salt);
      try {
        await openDatabase(derivedKey);
        await resetAttempts();
        lastAttemptTime = 0;
        set({ state: 'unlocked', attemptsRemaining: null, derivedKey });
        return 'UNLOCKED';
      } catch {
        return handleWrongPin(newAttemptCount, threshold, showAttempts, set);
      }
    } catch (error) {
      return 'WRONG_PIN';
    } finally {
      pinSubmitLock = false;
    }
  },

  lock: async () => {
    // Prevent concurrent lock operations and conflicts with submitPin
    if (lockOperationInProgress || pinSubmitLock) {
      return; // Already locking or PIN submission in progress
    }
    lockOperationInProgress = true;

    try {
      const { showAttempts, state } = get();

      // Only lock if currently unlocked or in duress mode
      if (state !== 'unlocked' && state !== 'duress') {
        return;
      }

      await closeDatabase();

      let attemptsRemaining: number | null = null;
      if (showAttempts) {
        const attempts = await getAttemptCount();
        const threshold = await getThreshold();
        attemptsRemaining = threshold - attempts;
      }

      set({ state: 'locked', attemptsRemaining, derivedKey: null });
    } finally {
      lockOperationInProgress = false;
    }
  },

  completeSetup: async (pin: string) => {
    const salt = await getOrCreateSalt();
    const derivedKey = await deriveKey(pin, salt);

    // Create fresh database (deletes any existing one first)
    await createDatabase(derivedKey);

    // Mark setup as complete so we don't show setup screen again
    await markSetupComplete();

    set({ state: 'unlocked', attemptsRemaining: null, derivedKey });
  },

  changePin: async (currentPin: string, newPin: string): Promise<ChangePinResult> => {
    try {
      const salt = await getOrCreateSalt();

      // 1. Check if new PIN matches duress PIN
      const matchesDuress = await isDuressPin(newPin, salt);
      if (matchesDuress) {
        return 'MATCHES_DURESS';
      }

      // 2. Verify current PIN by deriving key and checking if DB opens
      const currentKey = await deriveKey(currentPin, salt);
      try {
        // Close and reopen to verify the current PIN is correct
        await closeDatabase();
        await openDatabase(currentKey);
      } catch {
        // Current PIN is wrong - reopen with current key failed
        return 'WRONG_CURRENT_PIN';
      }

      // 3. Derive new key from new PIN
      const newKey = await deriveKey(newPin, salt);

      // 4. Store a recovery marker before rekey (boolean only — never store the key)
      await SecureStore.setItemAsync('tarn_rekey_in_progress', 'true');

      // 5. Rekey the database with the new key (SQLCipher rekey is atomic)
      await rekeyDatabase(newKey);

      // 6. Clear recovery marker
      await SecureStore.deleteItemAsync('tarn_rekey_in_progress');

      // Update stored key
      set({ derivedKey: newKey });

      return 'SUCCESS';
    } catch (error) {
      // Clean up recovery marker on error
      try {
        await SecureStore.deleteItemAsync('tarn_rekey_in_progress');
      } catch {
        // Ignore cleanup errors
      }
      return 'ERROR';
    }
  },

  verifyPin: async (pin: string): Promise<AuthResult> => {
    const { derivedKey: storedKey, showAttempts, postDestructBehavior, duressBehavior } = get();

    if (!storedKey) {
      return 'WRONG_PIN';
    }

    try {
      // Rate limiting (same as submitPin)
      const requiredDelay = await getRateLimitDelay();
      const timeSinceLastAttempt = Date.now() - lastAttemptTime;
      if (requiredDelay > 0 && timeSinceLastAttempt < requiredDelay) {
        await delay(requiredDelay - timeSinceLastAttempt);
      }
      lastAttemptTime = Date.now();

      const salt = await getOrCreateSalt();

      const check = await runSecurityChecks(pin, salt, duressBehavior, postDestructBehavior, set);
      if (check.action !== 'continue') {
        if (check.action === 'duress_hide') return 'DURESS_MODE';
        return 'DESTRUCTED';
      }

      const { newAttemptCount, threshold } = check;

      // Compare derived key with stored key
      const testKey = await deriveKey(pin, salt);
      if (testKey === storedKey) {
        await resetAttempts();
        lastAttemptTime = 0;
        return 'UNLOCKED';
      }

      return handleWrongPin(newAttemptCount, threshold, showAttempts, set);
    } catch {
      return 'WRONG_PIN';
    }
  },

  setShowAttempts: (show: boolean) => {
    SecureStore.setItemAsync('tarn_show_attempts', show ? 'true' : 'false').catch((e) => {
      if (__DEV__) console.error('Failed to persist showAttempts:', e);
    });
    set({ showAttempts: show });
  },

  setPostDestructBehavior: (behavior: PostDestructBehavior) => {
    SecureStore.setItemAsync('tarn_post_destruct', behavior).catch((e) => {
      if (__DEV__) console.error('Failed to persist postDestructBehavior:', e);
    });
    set({ postDestructBehavior: behavior });
  },

  setDuressBehavior: (behavior: DuressBehavior) => {
    SecureStore.setItemAsync('tarn_duress_behavior', behavior).catch((e) => {
      if (__DEV__) console.error('Failed to persist duressBehavior:', e);
    });
    set({ duressBehavior: behavior });
  },

  setScreenshotProtection: (enabled: boolean) => {
    SecureStore.setItemAsync('tarn_screenshot_protection', enabled ? 'true' : 'false').catch((e) => {
      if (__DEV__) console.error('Failed to persist screenshotProtection:', e);
    });
    set({ screenshotProtection: enabled });
  },

  reset: () => {
    pinSubmitLock = false;
    lockOperationInProgress = false;
    lastAttemptTime = 0;
    set({
      state: 'setup',
      attemptsRemaining: null,
      showAttempts: false,
      postDestructBehavior: 'fresh',
      duressBehavior: 'wipe',
      screenshotProtection: true,
      derivedKey: null,
    });
  },

  getDerivedKey: () => get().derivedKey,
}));
