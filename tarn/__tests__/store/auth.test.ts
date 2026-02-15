import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../../src/lib/store/auth';

// Mock dependencies
jest.mock('../../src/lib/crypto/keys', () => ({
  getOrCreateSalt: jest.fn().mockResolvedValue('mock-salt'),
  deriveKey: jest.fn().mockResolvedValue('mock-derived-key'),
}));

jest.mock('../../src/lib/crypto/attempts', () => ({
  getAttemptCount: jest.fn().mockResolvedValue(0),
  incrementAttempts: jest.fn().mockResolvedValue(1),
  resetAttempts: jest.fn().mockResolvedValue(undefined),
  getThreshold: jest.fn().mockResolvedValue(7),
  isSetupComplete: jest.fn().mockResolvedValue(false),
  markSetupComplete: jest.fn().mockResolvedValue(undefined),
  cleanupOrphanedState: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../src/lib/crypto/duress', () => ({
  isDuressPin: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../src/lib/crypto/destruct', () => ({
  executeDestruct: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/lib/db/database', () => ({
  openDatabase: jest.fn().mockResolvedValue(undefined),
  closeDatabase: jest.fn().mockResolvedValue(undefined),
  rekeyDatabase: jest.fn().mockResolvedValue(undefined),
  createDatabase: jest.fn().mockResolvedValue(undefined),
}));

const { getOrCreateSalt, deriveKey } = require('../../src/lib/crypto/keys');
const { getAttemptCount, incrementAttempts, resetAttempts, getThreshold, isSetupComplete, markSetupComplete, cleanupOrphanedState } = require('../../src/lib/crypto/attempts');
const { isDuressPin } = require('../../src/lib/crypto/duress');
const { executeDestruct } = require('../../src/lib/crypto/destruct');
const { openDatabase, closeDatabase, rekeyDatabase, createDatabase } = require('../../src/lib/db/database');

const mockGetItemAsync = SecureStore.getItemAsync as jest.Mock;
const mockSetItemAsync = SecureStore.setItemAsync as jest.Mock;
const mockDeleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;

describe('auth store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useAuthStore.getState().reset();
    // Reset mock defaults
    cleanupOrphanedState.mockResolvedValue(false);
    isSetupComplete.mockResolvedValue(false);
    getAttemptCount.mockResolvedValue(0);
    incrementAttempts.mockResolvedValue(1);
    getThreshold.mockResolvedValue(7);
    isDuressPin.mockResolvedValue(false);
    deriveKey.mockResolvedValue('mock-derived-key');
    openDatabase.mockResolvedValue(undefined);
    mockGetItemAsync.mockResolvedValue(null);
  });

  describe('initialize', () => {
    it('sets state to setup when not setup complete', async () => {
      isSetupComplete.mockResolvedValue(false);
      await useAuthStore.getState().initialize();
      expect(useAuthStore.getState().state).toBe('setup');
    });

    it('sets state to setup when orphaned state detected', async () => {
      cleanupOrphanedState.mockResolvedValue(true);
      isSetupComplete.mockResolvedValue(true);
      await useAuthStore.getState().initialize();
      expect(useAuthStore.getState().state).toBe('setup');
      // Should not even check setupComplete
      expect(isSetupComplete).not.toHaveBeenCalled();
    });

    it('sets state to locked when setup is complete', async () => {
      isSetupComplete.mockResolvedValue(true);
      await useAuthStore.getState().initialize();
      expect(useAuthStore.getState().state).toBe('locked');
    });

    it('loads settings from SecureStore', async () => {
      isSetupComplete.mockResolvedValue(true);
      mockGetItemAsync.mockImplementation((key: string) => {
        if (key === 'tarn_show_attempts') return Promise.resolve('true');
        if (key === 'tarn_post_destruct') return Promise.resolve('error');
        if (key === 'tarn_duress_behavior') return Promise.resolve('hide');
        if (key === 'tarn_screenshot_protection') return Promise.resolve('false');
        return Promise.resolve(null);
      });
      getAttemptCount.mockResolvedValue(2);
      getThreshold.mockResolvedValue(7);

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.showAttempts).toBe(true);
      expect(state.postDestructBehavior).toBe('error');
      expect(state.duressBehavior).toBe('hide');
      expect(state.screenshotProtection).toBe(false);
      expect(state.attemptsRemaining).toBe(5); // 7 - 2
    });

    it('cleans up interrupted rekey', async () => {
      isSetupComplete.mockResolvedValue(true);
      mockGetItemAsync.mockImplementation((key: string) => {
        if (key === 'tarn_rekey_in_progress') return Promise.resolve('true');
        return Promise.resolve(null);
      });

      await useAuthStore.getState().initialize();

      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_rekey_in_progress');
    });

    it('falls back to setup on error', async () => {
      cleanupOrphanedState.mockRejectedValue(new Error('fail'));
      await useAuthStore.getState().initialize();
      expect(useAuthStore.getState().state).toBe('setup');
    });
  });

  describe('submitPin', () => {
    beforeEach(async () => {
      // Set state to locked for submitPin tests
      isSetupComplete.mockResolvedValue(true);
      await useAuthStore.getState().initialize();
    });

    it('returns UNLOCKED on correct PIN', async () => {
      openDatabase.mockResolvedValue(undefined);
      const result = await useAuthStore.getState().submitPin('1234');

      expect(result).toBe('UNLOCKED');
      expect(useAuthStore.getState().state).toBe('unlocked');
      expect(resetAttempts).toHaveBeenCalled();
    });

    it('returns WRONG_PIN on incorrect PIN', async () => {
      openDatabase.mockRejectedValue(new Error('wrong key'));
      const result = await useAuthStore.getState().submitPin('0000');

      expect(result).toBe('WRONG_PIN');
      expect(incrementAttempts).toHaveBeenCalled();
    });

    it('increments attempt counter before key derivation', async () => {
      openDatabase.mockRejectedValue(new Error('wrong key'));
      await useAuthStore.getState().submitPin('0000');

      // incrementAttempts should be called BEFORE deriveKey
      const incrementCallOrder = incrementAttempts.mock.invocationCallOrder[0];
      const deriveCallOrder = deriveKey.mock.invocationCallOrder[0];
      expect(incrementCallOrder).toBeLessThan(deriveCallOrder);
    });

    it('returns DURESS_MODE when duress PIN entered in hide mode', async () => {
      isDuressPin.mockResolvedValue(true);
      useAuthStore.setState({ duressBehavior: 'hide' });

      const result = await useAuthStore.getState().submitPin('9999');

      expect(result).toBe('DURESS_MODE');
      expect(useAuthStore.getState().state).toBe('duress');
      expect(incrementAttempts).not.toHaveBeenCalled();
    });

    it('returns DESTRUCTED when duress PIN entered in wipe mode', async () => {
      isDuressPin.mockResolvedValue(true);
      useAuthStore.setState({ duressBehavior: 'wipe' });

      const result = await useAuthStore.getState().submitPin('9999');

      expect(result).toBe('DESTRUCTED');
      expect(executeDestruct).toHaveBeenCalledWith('fresh');
    });

    it('triggers destruct when attempts exceed threshold', async () => {
      incrementAttempts.mockResolvedValue(8); // > threshold of 7
      openDatabase.mockRejectedValue(new Error('wrong key'));

      const result = await useAuthStore.getState().submitPin('0000');

      expect(result).toBe('DESTRUCTED');
      expect(executeDestruct).toHaveBeenCalled();
    });

    it('triggers destruct when attempts equal threshold on wrong PIN', async () => {
      incrementAttempts.mockResolvedValue(7); // = threshold of 7
      openDatabase.mockRejectedValue(new Error('wrong key'));

      const result = await useAuthStore.getState().submitPin('0000');

      expect(result).toBe('DESTRUCTED');
    });

    it('updates attemptsRemaining when showAttempts is true', async () => {
      useAuthStore.setState({ showAttempts: true });
      incrementAttempts.mockResolvedValue(3);
      openDatabase.mockRejectedValue(new Error('wrong key'));

      await useAuthStore.getState().submitPin('0000');

      expect(useAuthStore.getState().attemptsRemaining).toBe(4); // 7 - 3
    });

    it('rejects concurrent submissions', async () => {
      // Make openDatabase slow
      openDatabase.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      const first = useAuthStore.getState().submitPin('1234');
      const second = useAuthStore.getState().submitPin('1234');

      const [firstResult, secondResult] = await Promise.all([first, second]);
      // The second should be rejected due to mutex
      expect(secondResult).toBe('WRONG_PIN');
    });
  });

  describe('lock', () => {
    it('transitions from unlocked to locked', async () => {
      useAuthStore.setState({ state: 'unlocked' });
      await useAuthStore.getState().lock();
      expect(useAuthStore.getState().state).toBe('locked');
      expect(closeDatabase).toHaveBeenCalled();
    });

    it('clears derivedKey on lock', async () => {
      useAuthStore.setState({ state: 'unlocked', derivedKey: 'some-key' });
      await useAuthStore.getState().lock();
      expect(useAuthStore.getState().derivedKey).toBeNull();
    });

    it('does not lock when already locked', async () => {
      useAuthStore.setState({ state: 'locked' });
      await useAuthStore.getState().lock();
      expect(closeDatabase).not.toHaveBeenCalled();
    });

    it('does not lock when in setup state', async () => {
      useAuthStore.setState({ state: 'setup' });
      await useAuthStore.getState().lock();
      expect(closeDatabase).not.toHaveBeenCalled();
    });

    it('locks from duress mode', async () => {
      useAuthStore.setState({ state: 'duress' });
      await useAuthStore.getState().lock();
      expect(useAuthStore.getState().state).toBe('locked');
      expect(closeDatabase).toHaveBeenCalled();
    });
  });

  describe('completeSetup', () => {
    it('creates database and marks setup complete', async () => {
      await useAuthStore.getState().completeSetup('1234');

      expect(getOrCreateSalt).toHaveBeenCalled();
      expect(deriveKey).toHaveBeenCalledWith('1234', 'mock-salt');
      expect(createDatabase).toHaveBeenCalledWith('mock-derived-key');
      expect(markSetupComplete).toHaveBeenCalled();
      expect(useAuthStore.getState().state).toBe('unlocked');
      expect(useAuthStore.getState().derivedKey).toBe('mock-derived-key');
    });
  });

  describe('changePin', () => {
    beforeEach(() => {
      useAuthStore.setState({ derivedKey: 'old-key' });
    });

    it('returns SUCCESS on successful PIN change', async () => {
      const result = await useAuthStore.getState().changePin('1234', '5678');

      expect(result).toBe('SUCCESS');
      expect(rekeyDatabase).toHaveBeenCalled();
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_rekey_in_progress', 'true');
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_rekey_in_progress');
    });

    it('does not store the derived key in SecureStore during rekey', async () => {
      await useAuthStore.getState().changePin('1234', '5678');

      // Verify no calls storing the actual key
      const setCalls = mockSetItemAsync.mock.calls;
      const keyStoreCalls = setCalls.filter(
        (call: string[]) => call[0] === 'tarn_rekey_new_key'
      );
      expect(keyStoreCalls).toHaveLength(0);
    });

    it('returns WRONG_CURRENT_PIN when current PIN is wrong', async () => {
      openDatabase.mockRejectedValue(new Error('wrong key'));
      const result = await useAuthStore.getState().changePin('wrong', '5678');
      expect(result).toBe('WRONG_CURRENT_PIN');
    });

    it('returns MATCHES_DURESS when new PIN matches duress', async () => {
      isDuressPin.mockResolvedValue(true);
      const result = await useAuthStore.getState().changePin('1234', '9999');
      expect(result).toBe('MATCHES_DURESS');
    });

    it('cleans up rekey marker on error', async () => {
      rekeyDatabase.mockRejectedValue(new Error('rekey failed'));
      const result = await useAuthStore.getState().changePin('1234', '5678');

      expect(result).toBe('ERROR');
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('tarn_rekey_in_progress');
    });
  });

  describe('verifyPin', () => {
    beforeEach(() => {
      useAuthStore.setState({
        state: 'unlocked',
        derivedKey: 'mock-derived-key',
        showAttempts: false,
        postDestructBehavior: 'fresh',
        duressBehavior: 'wipe',
      });
    });

    it('returns WRONG_PIN when no stored key', async () => {
      useAuthStore.setState({ derivedKey: null });
      const result = await useAuthStore.getState().verifyPin('1234');
      expect(result).toBe('WRONG_PIN');
    });

    it('returns UNLOCKED on correct PIN', async () => {
      deriveKey.mockResolvedValue('mock-derived-key');
      const result = await useAuthStore.getState().verifyPin('1234');
      expect(result).toBe('UNLOCKED');
      expect(resetAttempts).toHaveBeenCalled();
    });

    it('returns WRONG_PIN on incorrect PIN', async () => {
      deriveKey.mockResolvedValue('different-key');
      const result = await useAuthStore.getState().verifyPin('0000');
      expect(result).toBe('WRONG_PIN');
      expect(incrementAttempts).toHaveBeenCalled();
    });

    it('increments attempts before comparing keys', async () => {
      deriveKey.mockResolvedValue('different-key');
      await useAuthStore.getState().verifyPin('0000');

      const incrementCallOrder = incrementAttempts.mock.invocationCallOrder[0];
      const deriveCallOrder = deriveKey.mock.invocationCallOrder[0];
      expect(incrementCallOrder).toBeLessThan(deriveCallOrder);
    });

    it('returns DESTRUCTED when duress PIN entered in wipe mode', async () => {
      isDuressPin.mockResolvedValue(true);
      const result = await useAuthStore.getState().verifyPin('9999');

      expect(result).toBe('DESTRUCTED');
      expect(executeDestruct).toHaveBeenCalledWith('fresh');
    });

    it('returns DURESS_MODE when duress PIN entered in hide mode', async () => {
      isDuressPin.mockResolvedValue(true);
      useAuthStore.setState({ duressBehavior: 'hide' });
      const result = await useAuthStore.getState().verifyPin('9999');

      expect(result).toBe('DURESS_MODE');
      expect(useAuthStore.getState().state).toBe('duress');
    });

    it('triggers destruct when attempts exceed threshold', async () => {
      deriveKey.mockResolvedValue('different-key');
      incrementAttempts.mockResolvedValue(8);
      const result = await useAuthStore.getState().verifyPin('0000');

      expect(result).toBe('DESTRUCTED');
      expect(executeDestruct).toHaveBeenCalled();
    });

    it('updates attemptsRemaining when showAttempts is true', async () => {
      useAuthStore.setState({ showAttempts: true });
      deriveKey.mockResolvedValue('different-key');
      incrementAttempts.mockResolvedValue(3);

      await useAuthStore.getState().verifyPin('0000');

      expect(useAuthStore.getState().attemptsRemaining).toBe(4); // 7 - 3
    });
  });

  describe('settings setters', () => {
    it('setShowAttempts persists with catch', () => {
      mockSetItemAsync.mockResolvedValue(undefined);
      useAuthStore.getState().setShowAttempts(true);
      expect(useAuthStore.getState().showAttempts).toBe(true);
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_show_attempts', 'true');
    });

    it('setPostDestructBehavior persists with catch', () => {
      mockSetItemAsync.mockResolvedValue(undefined);
      useAuthStore.getState().setPostDestructBehavior('error');
      expect(useAuthStore.getState().postDestructBehavior).toBe('error');
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_post_destruct', 'error');
    });

    it('setDuressBehavior persists with catch', () => {
      mockSetItemAsync.mockResolvedValue(undefined);
      useAuthStore.getState().setDuressBehavior('hide');
      expect(useAuthStore.getState().duressBehavior).toBe('hide');
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_duress_behavior', 'hide');
    });

    it('setScreenshotProtection persists with catch', () => {
      mockSetItemAsync.mockResolvedValue(undefined);
      useAuthStore.getState().setScreenshotProtection(false);
      expect(useAuthStore.getState().screenshotProtection).toBe(false);
      expect(mockSetItemAsync).toHaveBeenCalledWith('tarn_screenshot_protection', 'false');
    });
  });
});
