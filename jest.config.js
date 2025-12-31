export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  // Handle ESM modules from @noble packages
  transformIgnorePatterns: [
    'node_modules/(?!(@noble)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/cli/index.js',
    '!src/cli/demo.js',
    '!src/cli/bitcoinDemo.js',
    '!src/cli/nostrDemo.js',
    '!src/index.js'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 80,
      statements: 80
    },
    'src/crypto/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    },
    'src/bitcoin/': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    'src/core/': {
      branches: 75,
      functions: 80,
      lines: 85,
      statements: 85
    }
  },
  coverageReporters: ['text', 'html', 'lcov', 'json-summary'],
  testTimeout: 30000,
  verbose: true
};