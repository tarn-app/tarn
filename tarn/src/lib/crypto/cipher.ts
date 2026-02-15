import { randomBytes, createCipheriv, createDecipheriv } from 'react-native-quick-crypto';
import { Buffer } from '@craftzdog/react-native-buffer';
import { deriveKey } from './keys';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag
const KEY_HEX_LENGTH = 64; // 256 bits = 32 bytes = 64 hex chars

interface EncryptedData {
  iv: string; // base64
  tag: string; // base64
  data: string; // base64
  version: number;
}

// In practice keyHex always comes from deriveKey() which uses Argon2 with
// hashLength: 32, so it's always 64 hex chars. This check is defense-in-depth.
function assertKeyLength(keyHex: string): void {
  if (keyHex.length !== KEY_HEX_LENGTH) {
    throw new Error(`Expected ${KEY_HEX_LENGTH}-char hex key (256 bits), got ${keyHex.length}`);
  }
}

function encrypt(plaintext: string, keyHex: string): EncryptedData {
  assertKeyLength(keyHex);

  // Convert everything to Uint8Array before passing to quick-crypto.
  // @craftzdog/react-native-buffer's Buffer is a different type than what
  // quick-crypto expects internally — raw Uint8Array is the safe interop.
  const key = new Uint8Array(Buffer.from(keyHex, 'hex'));
  const iv = new Uint8Array(randomBytes(IV_LENGTH));

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  // Work in binary throughout. Concatenating base64 strings from update()+final()
  // breaks in quick-crypto because update() may emit padded base64 chunks.
  const input = new Uint8Array(Buffer.from(plaintext, 'utf8'));
  const updated = new Uint8Array(cipher.update(input));
  const final = new Uint8Array(cipher.final());
  const tag = new Uint8Array(cipher.getAuthTag());

  // Concatenate cipher output as raw bytes, then encode once
  const ciphertext = new Uint8Array(updated.length + final.length);
  ciphertext.set(updated, 0);
  ciphertext.set(final, updated.length);

  return {
    iv: Buffer.from(iv).toString('base64'),
    tag: Buffer.from(tag).toString('base64'),
    data: Buffer.from(ciphertext).toString('base64'),
    version: 1,
  };
}

function decrypt(encrypted: EncryptedData, keyHex: string): string {
  assertKeyLength(keyHex);

  // All params as Uint8Array — same interop reasoning as encrypt()
  const key = new Uint8Array(Buffer.from(keyHex, 'hex'));
  const iv = new Uint8Array(Buffer.from(encrypted.iv, 'base64'));
  const tag = new Uint8Array(Buffer.from(encrypted.tag, 'base64'));
  const data = new Uint8Array(Buffer.from(encrypted.data, 'base64'));

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  // Binary in, binary out — decode to utf8 only after concatenation
  const updated = new Uint8Array(decipher.update(data));
  const final = new Uint8Array(decipher.final());

  const plaintext = new Uint8Array(updated.length + final.length);
  plaintext.set(updated, 0);
  plaintext.set(final, updated.length);

  return Buffer.from(plaintext).toString('utf8');
}

interface ExportFile {
  app: 'tarn';
  version: number;
  exportedAt: string;
  salt: string; // The Argon2 salt used to derive the encryption key
  encrypted: EncryptedData;
}

export interface ExportPayload {
  entries: Array<{
    date: string;
    flow: number;
    temp: number | null;
    mucus: number;
    symptoms: string[];
    note: string;
  }>;
  settings?: {
    threshold?: number;
  };
}

export function createExportFile(payload: ExportPayload, keyHex: string, salt: string): ExportFile {
  const plaintext = JSON.stringify(payload);
  const encrypted = encrypt(plaintext, keyHex);

  return {
    app: 'tarn',
    version: 1,
    exportedAt: new Date().toISOString(),
    salt,
    encrypted,
  };
}

/**
 * Parse and decrypt an export file. Derives the decryption key from the
 * provided PIN and the salt embedded in the file — so this works even on
 * a new device / fresh install where the local salt is different.
 */
export async function parseExportFile(fileContent: string, pin: string): Promise<ExportPayload> {
  let file: ExportFile;

  try {
    file = JSON.parse(fileContent);
  } catch {
    throw new Error('Invalid file format');
  }

  if (file.app !== 'tarn') {
    throw new Error('Not a valid backup file');
  }

  if (file.version !== 1) {
    throw new Error('Backup file format not supported');
  }

  if (!file.salt) {
    throw new Error('Backup file missing salt (created with older version)');
  }

  // Re-derive the key using the PIN + the salt from the export file
  const keyHex = await deriveKey(pin, file.salt);
  const decrypted = decrypt(file.encrypted, keyHex);

  let payload: ExportPayload;
  try {
    payload = JSON.parse(decrypted);
  } catch {
    throw new Error('Corrupted backup data');
  }

  // Basic validation
  if (!Array.isArray(payload.entries)) {
    throw new Error('Invalid backup: missing entries');
  }

  return payload;
}
