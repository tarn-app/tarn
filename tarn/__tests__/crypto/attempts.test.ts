import * as SecureStore from 'expo-secure-store';
import {
  getAttemptCount,
  incrementAttempts,
  resetAttempts,
  getThreshold,
  setThreshold,
  isSetupComplete,
  markSetupComplete,
  clearAllSecureStorage,
} from '../../src/lib/crypto/attempts';

// Mock is set up in jest.setup.js
const mockGetItemAsync = SecureStore.getItemAsync as jest.Mock;
const mockSetItemAsync = SecureStore.setItemAsync as jest.Mock;
const mockDeleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;

describe('attempts module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAttemptCount', () => {
    it('returns 0 when no attempts stored', async () => {
      mockGetItemAsync.mockResolvedValue(null);
      const count = await getAttemptCount();
      expect(count).toBe(0);
    });

    it('returns stored attempt count', async () => {
      mockGetItemAsync.mockResolvedValue('3');
      const count = await getAttemptCount();
      expect(count).toBe(3);
    });

    it('calls SecureStore with correct key', async () => {
      mockGetItemAsync.mockResolvedValue(null);
      await getAttemptCount();
      expect(mockGetItemAsync).toHaveBeenCalledWith('tarn_attempts');
    });
  });

  describe('incrementAttempts', () => {
    it('increments from 0 when no previous attempts', async () => {
      mockGetItemAsync.mockResolvedValue(null);
      const newCount = await incrementAttempts();
      expect(newCount).toBe(1);
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_attempts', '1');
    });

    it('increments existing count', async () => {
      mockGetItemAsync.mockResolvedValue('5');
      const newCount = await incrementAttempts();
      expect(newCount).toBe(6);
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_attempts', '6');
    });
  });

  describe('resetAttempts', () => {
    it('sets attempt count to 0', async () => {
      await resetAttempts();
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_attempts', '0');
    });
  });

  describe('getThreshold', () => {
    it('returns default threshold (7) when not set', async () => {
      mockGetItemAsync.mockResolvedValue(null);
      const threshold = await getThreshold();
      expect(threshold).toBe(7);
    });

    it('returns stored threshold', async () => {
      mockGetItemAsync.mockResolvedValue('10');
      const threshold = await getThreshold();
      expect(threshold).toBe(10);
    });

    it('calls SecureStore with correct key', async () => {
      mockGetItemAsync.mockResolvedValue(null);
      await getThreshold();
      expect(mockGetItemAsync).toHaveBeenCalledWith('tarn_threshold');
    });
  });

  describe('setThreshold', () => {
    it('stores threshold value', async () => {
      await setThreshold(10);
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_threshold', '10');
    });

    it('clamps threshold to minimum of 5', async () => {
      await setThreshold(3);
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_threshold', '5');
    });

    it('clamps threshold to maximum of 15', async () => {
      await setThreshold(20);
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_threshold', '15');
    });

    it('allows values within range', async () => {
      await setThreshold(5);
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_threshold', '5');

      jest.clearAllMocks();
      await setThreshold(15);
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_threshold', '15');
    });
  });

  describe('isSetupComplete', () => {
    it('returns false when setup not complete', async () => {
      mockGetItemAsync.mockResolvedValue(null);
      const result = await isSetupComplete();
      expect(result).toBe(false);
    });

    it('returns false when setup value is not "complete"', async () => {
      mockGetItemAsync.mockResolvedValue('partial');
      const result = await isSetupComplete();
      expect(result).toBe(false);
    });

    it('returns true when setup is complete', async () => {
      mockGetItemAsync.mockResolvedValue('complete');
      const result = await isSetupComplete();
      expect(result).toBe(true);
    });
  });

  describe('markSetupComplete', () => {
    it('sets setup flag to "complete"', async () => {
      await markSetupComplete();
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_setup', 'complete');
    });
  });

  describe('clearAllSecureStorage', () => {
    it('deletes all security-related keys', async () => {
      await clearAllSecureStorage();

      // Core security keys
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_attempts');
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_threshold');
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_setup');
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_salt');
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_duress');
      // Settings that should be wiped
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_show_attempts');
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_post_destruct');
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_duress_behavior');
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_screenshot_protection');
      // Rekey recovery marker
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_rekey_in_progress');
      // Data retention setting
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_retention_months');
      expect(mockDeleteItemAsync).toHaveBeenCalledTimes(11);
    });
  });
});
