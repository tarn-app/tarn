import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import Argon2 from 'react-native-argon2';
import { bufferToBase64 } from '../utils/encoding';

export const SALT_KEY = 'tarn_salt';

// Argon2id parameters - tuned for mobile devices
// Memory: 64MB (65536 KiB), Iterations: 3, Parallelism: 1
const ARGON2_CONFIG = {
  mode: 'argon2id' as const,
  memory: 65536,       // 64 MB in KiB
  iterations: 3,
  parallelism: 1,
  hashLength: 32,      // 256 bits for SQLCipher key
};

export async function generateSalt(): Promise<string> {
  const saltBytes = await Crypto.getRandomBytesAsync(32);
  return bufferToBase64(saltBytes);
}

export async function getOrCreateSalt(): Promise<string> {
  let salt = await SecureStore.getItemAsync(SALT_KEY);

  if (!salt) {
    salt = await generateSalt();
    await SecureStore.setItemAsync(SALT_KEY, salt);
  }

  return salt;
}

class KeyDerivationError extends Error {
  constructor(message: string, public readonly isMemoryError: boolean = false) {
    super(message);
    this.name = 'KeyDerivationError';
  }
}

export async function deriveKey(pin: string, salt: string): Promise<string> {
  try {
    const result = await Argon2(pin, salt, ARGON2_CONFIG);

    // Returns hex-encoded hash for SQLCipher PRAGMA key
    return result.rawHash;
  } catch (error) {
    // Check for memory-related errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isMemoryError = errorMessage.toLowerCase().includes('memory') ||
                          errorMessage.toLowerCase().includes('alloc') ||
                          errorMessage.toLowerCase().includes('oom');

    if (isMemoryError) {
      throw new KeyDerivationError(
        'Not enough memory available. Please close other apps and try again.',
        true
      );
    }

    // Re-throw other errors
    throw new KeyDerivationError('Unable to verify PIN. Please try again.');
  }
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const result = await Argon2(pin, salt, ARGON2_CONFIG);

  return result.encodedHash;
}

export async function clearSalt(): Promise<void> {
  await SecureStore.deleteItemAsync(SALT_KEY);
}

