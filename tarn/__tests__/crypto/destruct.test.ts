/**
 * Tests for destruct.ts - Self-destruct functionality
 */

// Mock dependencies before importing
jest.mock('../../src/lib/db/database', () => ({
  closeDatabase: jest.fn().mockResolvedValue(undefined),
  getDatabasePath: jest.fn().mockReturnValue('/data/tarn.db'),
}));

jest.mock('../../src/lib/crypto/attempts', () => ({
  clearAllSecureStorage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/lib/utils/wipe', () => ({
  secureWipeFile: jest.fn().mockResolvedValue(undefined),
  secureWipeDirectory: jest.fn().mockResolvedValue(undefined),
  getDocumentDirectory: jest.fn().mockReturnValue('/data/documents'),
  getCacheDirectory: jest.fn().mockReturnValue('/data/cache'),
}));

import { executeDestruct, manualWipe } from '../../src/lib/crypto/destruct';
import { closeDatabase, getDatabasePath } from '../../src/lib/db/database';
import { clearAllSecureStorage } from '../../src/lib/crypto/attempts';
import { secureWipeFile, secureWipeDirectory, getDocumentDirectory, getCacheDirectory } from '../../src/lib/utils/wipe';

describe('destruct module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset implementations to default resolved values
    (closeDatabase as jest.Mock).mockResolvedValue(undefined);
    (getDatabasePath as jest.Mock).mockReturnValue('/data/tarn.db');
    (clearAllSecureStorage as jest.Mock).mockResolvedValue(undefined);
    (secureWipeFile as jest.Mock).mockResolvedValue(undefined);
    (secureWipeDirectory as jest.Mock).mockResolvedValue(undefined);
    (getDocumentDirectory as jest.Mock).mockReturnValue('/data/documents');
    (getCacheDirectory as jest.Mock).mockReturnValue('/data/cache');
  });

  describe('executeDestruct', () => {
    it('closes the database first', async () => {
      await executeDestruct('fresh');

      expect(closeDatabase).toHaveBeenCalled();
    });

    it('wipes the database file and WAL/SHM files', async () => {
      await executeDestruct('fresh');

      expect(secureWipeFile).toHaveBeenCalledWith('/data/tarn.db');
      expect(secureWipeFile).toHaveBeenCalledWith('/data/tarn.db-wal');
      expect(secureWipeFile).toHaveBeenCalledWith('/data/tarn.db-shm');
    });

    it('clears all secure storage', async () => {
      await executeDestruct('fresh');

      expect(clearAllSecureStorage).toHaveBeenCalled();
    });

    it('wipes document directory', async () => {
      await executeDestruct('fresh');

      expect(secureWipeDirectory).toHaveBeenCalledWith('/data/documents');
    });

    it('wipes cache directory', async () => {
      await executeDestruct('fresh');

      expect(secureWipeDirectory).toHaveBeenCalledWith('/data/cache');
    });

    it('returns the specified behavior', async () => {
      const freshResult = await executeDestruct('fresh');
      expect(freshResult).toBe('fresh');

      const errorResult = await executeDestruct('error');
      expect(errorResult).toBe('error');
    });

    it('defaults to fresh behavior', async () => {
      const result = await executeDestruct();
      expect(result).toBe('fresh');
    });

    it('handles missing database path gracefully', async () => {
      (getDatabasePath as jest.Mock).mockReturnValueOnce(null);

      await expect(executeDestruct('fresh')).resolves.toBe('fresh');
      expect(secureWipeFile).not.toHaveBeenCalled();
    });

    it('handles missing directories gracefully', async () => {
      (getDocumentDirectory as jest.Mock).mockReturnValueOnce(null);
      (getCacheDirectory as jest.Mock).mockReturnValueOnce(null);

      await expect(executeDestruct('fresh')).resolves.toBe('fresh');
      expect(secureWipeDirectory).not.toHaveBeenCalled();
    });

    it('continues destruction even if individual steps fail', async () => {
      (secureWipeFile as jest.Mock).mockRejectedValueOnce(new Error('File wipe failed'));

      await expect(executeDestruct('fresh')).resolves.toBe('fresh');
      // Should still attempt to clear secure storage
      expect(clearAllSecureStorage).toHaveBeenCalled();
    });

    it('attempts to clear secure storage even on catastrophic failure', async () => {
      (closeDatabase as jest.Mock).mockRejectedValueOnce(new Error('Database error'));
      (secureWipeFile as jest.Mock).mockRejectedValue(new Error('Wipe error'));
      (secureWipeDirectory as jest.Mock).mockRejectedValue(new Error('Dir error'));

      await expect(executeDestruct('fresh')).resolves.toBe('fresh');
      expect(clearAllSecureStorage).toHaveBeenCalled();
    });
  });

  describe('manualWipe', () => {
    it('executes full destruction sequence', async () => {
      await manualWipe();

      // Verifies all destruction steps are called
      expect(closeDatabase).toHaveBeenCalled();
      expect(secureWipeFile).toHaveBeenCalledWith('/data/tarn.db');
      expect(secureWipeFile).toHaveBeenCalledWith('/data/tarn.db-wal');
      expect(secureWipeFile).toHaveBeenCalledWith('/data/tarn.db-shm');
      expect(secureWipeDirectory).toHaveBeenCalledWith('/data/documents');
      expect(secureWipeDirectory).toHaveBeenCalledWith('/data/cache');
      expect(clearAllSecureStorage).toHaveBeenCalled();
    });
  });
});
