export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/cli/index.js',
    '!src/index.js'
  ],
  coverageThreshold: {
    'src/crypto/': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  verbose: true
};