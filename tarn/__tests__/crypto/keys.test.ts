import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import {
  generateSalt,
  getOrCreateSalt,
  deriveKey,
  hashPin,
  clearSalt,
} from '../../src/lib/crypto/keys';

// Mocks are set up in jest.setup.js
const mockGetItemAsync = SecureStore.getItemAsync as jest.Mock;
const mockSetItemAsync = SecureStore.setItemAsync as jest.Mock;
const mockDeleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;
const mockGetRandomBytesAsync = Crypto.getRandomBytesAsync as jest.Mock;

// Get the mocked Argon2 function
const mockArgon2 = jest.requireMock('react-native-argon2').default as jest.Mock;

describe('keys module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSalt', () => {
    it('generates a 32-byte salt as base64', async () => {
      // Mock returns Uint8Array of 32 zeros
      mockGetRandomBytesAsync.mockResolvedValue(new Uint8Array(32).fill(0));

      const salt = await generateSalt();

      // 32 bytes of zeros encoded as base64
      expect(mockGetRandomBytesAsync).toHaveBeenCalledWith(32);
      expect(typeof salt).toBe('string');
      expect(salt.length).toBeGreaterThan(0);
    });

    it('generates different salts for different random bytes', async () => {
      // First call
      mockGetRandomBytesAsync.mockResolvedValueOnce(new Uint8Array(32).fill(0));
      const salt1 = await generateSalt();

      // Second call with different bytes
      mockGetRandomBytesAsync.mockResolvedValueOnce(new Uint8Array(32).fill(255));
      const salt2 = await generateSalt();

      expect(salt1).not.toBe(salt2);
    });
  });

  describe('getOrCreateSalt', () => {
    it('returns existing salt if stored', async () => {
      const existingSalt = 'existingSaltBase64==';
      mockGetItemAsync.mockResolvedValue(existingSalt);

      const salt = await getOrCreateSalt();

      expect(salt).toBe(existingSalt);
      expect(mockGetItemAsync).toHaveBeenCalledWith('tarn_salt');
      expect(mockSetItemAsync).not.toHaveBeenCalled();
    });

    it('generates and stores new salt if none exists', async () => {
      mockGetItemAsync.mockResolvedValue(null);
      mockGetRandomBytesAsync.mockResolvedValue(new Uint8Array(32).fill(42));

      const salt = await getOrCreateSalt();

      expect(mockGetItemAsync).toHaveBeenCalledWith('tarn_salt');
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_salt', salt);
      expect(typeof salt).toBe('string');
    });
  });

  describe('deriveKey', () => {
    it('calls Argon2 with correct parameters', async () => {
      mockArgon2.mockResolvedValue({
        rawHash: 'derivedKeyHex',
        encodedHash: '$argon2id$...',
      });

      const key = await deriveKey('1234', 'testSalt');

      expect(mockArgon2).toHaveBeenCalledWith('1234', 'testSalt', {
        mode: 'argon2id',
        memory: 65536,
        iterations: 3,
        parallelism: 1,
        hashLength: 32,
      });
      expect(key).toBe('derivedKeyHex');
    });

    it('returns rawHash for SQLCipher key', async () => {
      mockArgon2.mockResolvedValue({
        rawHash: 'hexEncodedKey',
        encodedHash: '$argon2id$encoded',
      });

      const key = await deriveKey('5678', 'anotherSalt');

      expect(key).toBe('hexEncodedKey');
    });
  });

  describe('hashPin', () => {
    it('calls Argon2 with correct parameters', async () => {
      mockArgon2.mockResolvedValue({
        rawHash: 'rawHashValue',
        encodedHash: '$argon2id$v=19$m=65536,t=3,p=1$salt$hash',
      });

      const hash = await hashPin('1234', 'testSalt');

      expect(mockArgon2).toHaveBeenCalledWith('1234', 'testSalt', {
        mode: 'argon2id',
        memory: 65536,
        iterations: 3,
        parallelism: 1,
        hashLength: 32,
      });
      expect(hash).toBe('$argon2id$v=19$m=65536,t=3,p=1$salt$hash');
    });

    it('returns encodedHash for duress PIN comparison', async () => {
      mockArgon2.mockResolvedValue({
        rawHash: 'rawValue',
        encodedHash: 'encodedHashForStorage',
      });

      const hash = await hashPin('9999', 'salt');

      expect(hash).toBe('encodedHashForStorage');
    });
  });

  describe('clearSalt', () => {
    it('deletes salt from secure storage', async () => {
      await clearSalt();

      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_salt');
      expect(mockDeleteItemAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('key derivation consistency', () => {
    it('same PIN and salt produce same key', async () => {
      mockArgon2.mockResolvedValue({
        rawHash: 'consistentKey',
        encodedHash: 'encoded',
      });

      const key1 = await deriveKey('1234', 'sameSalt');
      const key2 = await deriveKey('1234', 'sameSalt');

      expect(key1).toBe(key2);
    });

    it('different PINs produce different keys (mocked behavior)', async () => {
      mockArgon2
        .mockResolvedValueOnce({ rawHash: 'key1', encodedHash: 'e1' })
        .mockResolvedValueOnce({ rawHash: 'key2', encodedHash: 'e2' });

      const key1 = await deriveKey('1234', 'sameSalt');
      const key2 = await deriveKey('5678', 'sameSalt');

      expect(key1).not.toBe(key2);
    });

    it('different salts produce different keys (mocked behavior)', async () => {
      mockArgon2
        .mockResolvedValueOnce({ rawHash: 'keyA', encodedHash: 'eA' })
        .mockResolvedValueOnce({ rawHash: 'keyB', encodedHash: 'eB' });

      const key1 = await deriveKey('1234', 'salt1');
      const key2 = await deriveKey('1234', 'salt2');

      expect(key1).not.toBe(key2);
    });
  });
});
