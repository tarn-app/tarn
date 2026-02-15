const tsParser = require('@typescript-eslint/parser');
const noNetworkCalls = require('./eslint-rules/no-network-calls');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'build/**',
      '*.config.js',
      'eslint-rules/**',
      'plugins/**',
      '__tests__/**',
      'components/__tests__/**',
      '**/*.js',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'local-rules': {
        rules: {
          'no-network-calls': noNetworkCalls,
        },
      },
    },
    rules: {
      // CRITICAL: No network calls allowed for security
      'local-rules/no-network-calls': 'error',
    },
  },
];
