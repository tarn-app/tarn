// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  cacheDirectory: '/mock/cache/',
  Paths: {
    document: { uri: '/mock/documents/' },
    cache: { uri: '/mock/cache/' },
  },
  File: jest.fn().mockImplementation((uri) => ({
    uri,
    exists: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(undefined),
    write: jest.fn().mockResolvedValue(undefined),
    size: jest.fn().mockResolvedValue(1024),
  })),
  Directory: jest.fn().mockImplementation((uri) => ({
    uri,
    exists: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(undefined),
    list: jest.fn().mockResolvedValue([]),
  })),
}));

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn().mockResolvedValue(undefined),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
    closeAsync: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock react-native-argon2 (default export is the function)
jest.mock('react-native-argon2', () => {
  const mockArgon2 = jest.fn().mockResolvedValue({
    rawHash: 'mockedHashBase64==',
    encodedHash: '$argon2id$v=19$m=65536,t=3,p=1$mockSalt$mockHash',
  });
  return {
    __esModule: true,
    default: mockArgon2,
  };
});

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn((size) => new Uint8Array(size).fill(0)),
  getRandomBytesAsync: jest.fn(async (size) => new Uint8Array(size).fill(0)),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// Mock expo-screen-capture
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(),
  allowScreenCaptureAsync: jest.fn(),
}));
