import * as SecureStore from 'expo-secure-store';
import { hashPin, deriveKey } from './keys';

const DURESS_KEY = 'tarn_duress';

export async function isMainPin(
  pin: string,
  salt: string,
  mainDerivedKey: string
): Promise<boolean> {
  const testKey = await deriveKey(pin, salt);
  return testKey === mainDerivedKey;
}

export async function setDuressPin(
  duressPin: string,
  salt: string,
  mainDerivedKey: string
): Promise<void> {
  // Prevent duress PIN from being the same as main PIN
  if (await isMainPin(duressPin, salt, mainDerivedKey)) {
    throw new Error('Safety PIN cannot be the same as your main PIN');
  }

  const hash = await hashPin(duressPin, salt);
  await SecureStore.setItemAsync(DURESS_KEY, hash);
}

export async function hasDuressPin(): Promise<boolean> {
  const hash = await SecureStore.getItemAsync(DURESS_KEY);
  return hash !== null;
}

// Always computes hash BEFORE checking if duress is configured to prevent
// timing attacks that could reveal whether duress mode is enabled.
export async function isDuressPin(
  enteredPin: string,
  salt: string
): Promise<boolean> {
  // ALWAYS compute hash first to prevent timing leak
  // This ensures the function takes the same time whether or not
  // a duress PIN is configured
  const enteredHash = await hashPin(enteredPin, salt);

  const storedHash = await SecureStore.getItemAsync(DURESS_KEY);
  if (!storedHash) {
    return false;
  }

  // Use constant-time comparison to prevent timing attacks on the hash comparison
  return constantTimeEqual(enteredHash, storedHash);
}

function constantTimeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let result = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return result === 0;
}

export async function clearDuressPin(): Promise<void> {
  await SecureStore.deleteItemAsync(DURESS_KEY);
}
