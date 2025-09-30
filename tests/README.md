# ECHOLOCK Test Suite

Comprehensive test suite covering crypto, Nostr, and Bitcoin components.

## Test Structure

```
tests/
├── unit/                   # Unit tests (fast, isolated)
│   ├── crypto.test.js     # Encryption/decryption tests
│   └── bitcoin-keys.test.js # Bitcoin key management tests
├── integration/           # Integration tests (E2E workflows)
│   ├── full-lifecycle.test.js  # Complete workflows
│   ├── failure-modes.test.js   # Error handling
│   └── timing.test.js          # Time synchronization
└── helpers/               # Test utilities
    ├── mockRelayServer.js      # Nostr relay mock
    ├── testBitcoinRPC.js       # Bitcoin API mock
    ├── timeTravel.js           # Time manipulation
    └── testCleanup.js          # Data cleanup
```

## Running Tests

### All Tests
```bash
npm test                    # Run all tests
npm run test:all           # Explicit all tests
```

### Unit Tests Only
```bash
npm run test:unit          # Fast unit tests only
```

### Integration Tests Only
```bash
npm run test:integration   # E2E integration tests
```

### With Coverage
```bash
npm run test:coverage      # Generate coverage report
```

### Watch Mode
```bash
npm run test:watch         # Re-run on file changes
```

### Network Tests (Real APIs)
```bash
npm run test:network       # Use real Nostr/Bitcoin APIs
```

## Test Scenarios

### Full Lifecycle Tests
- **Scenario A**: Local-only mode (no Nostr, no Bitcoin)
  - Create → wait for expiry → reconstruct
  - Multiple check-ins
  - Timer reset functionality

- **Scenario B**: Nostr distribution mode
  - Publish to relays
  - Retrieve from relays
  - Relay failure handling

- **Scenario C**: Bitcoin timelock mode (dry-run)
  - Create with password
  - Verify timelock
  - Early release prevention
  - PSBT creation

- **Scenario D**: Full integration (Nostr + Bitcoin)
  - All components working together

### Failure Mode Tests
- Corrupted fragment data
- Missing fragments (below threshold)
- Wrong password for Bitcoin key
- Network timeouts
- Bitcoin API unavailable
- No UTXOs / insufficient funds
- Corrupted ciphertext/auth tags

### Timing Tests
- App timer vs Bitcoin timelock sync
- Clock skew scenarios
- Race conditions in check-ins
- Expiry edge cases
- Block timing variations

## Coverage Goals

Current target: **80%+ code coverage**

| Component | Target |
|-----------|--------|
| Crypto    | 100%   |
| Bitcoin   | 80%    |
| Nostr     | 70%    |
| Core      | 85%    |

## Test Helpers

### Mock Relay Server
```javascript
import { MockRelayServer, createMockRelays } from '../helpers/mockRelayServer.js';

const relay = new MockRelayServer('wss://relay.test', {
  latency: 100,  // Simulate network delay
  shouldFail: false  // Simulate failure
});

await relay.publish(event);
const events = await relay.subscribe(filters);
```

### Mock Bitcoin API
```javascript
import {
  setMockBlockHeight,
  advanceBlocks,
  addMockUTXOs
} from '../helpers/testBitcoinRPC.js';

setMockBlockHeight(2500000);
advanceBlocks(100);  // Simulate 100 new blocks
addMockUTXOs(address, utxos);
```

### Time Travel
```javascript
import { TimeController } from '../helpers/timeTravel.js';

const time = new TimeController();
time.start();
time.advanceHours(24);  // Jump 24 hours
time.advanceDays(7);    // Jump 7 days
```

### Test Cleanup
```javascript
import {
  setupTestEnvironment,
  teardownTestEnvironment
} from '../helpers/testCleanup.js';

beforeEach(() => setupTestEnvironment());
afterEach(() => teardownTestEnvironment());
```

## Writing New Tests

### Unit Test Template
```javascript
import { describe, it, expect } from '@jest/globals';

describe('My Component', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Integration Test Template
```javascript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { setupTestEnvironment, teardownTestEnvironment } from '../helpers/testCleanup.js';

describe('Integration: My Feature', () => {
  beforeEach(() => setupTestEnvironment());
  afterEach(() => teardownTestEnvironment());

  it('should complete full workflow', async () => {
    // Test end-to-end workflow
  });
});
```

## CI/CD

Tests run automatically on:
- Every commit (unit tests)
- Every pull request (unit + integration)
- Main/develop branch pushes (full suite + coverage)

### GitHub Actions
- `.github/workflows/test.yml` - Main test workflow
- Runs on Node 18.x, 20.x, 22.x
- Uploads coverage to Codecov
- Generates test summaries

## Debugging Tests

### Run single test file
```bash
npm test tests/unit/crypto.test.js
```

### Run tests matching pattern
```bash
npm test -- --testNamePattern="should encrypt"
```

### Verbose output
```bash
npm test -- --verbose
```

### Debug in VSCode
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Troubleshooting

### Test timeouts
Increase timeout in `jest.config.js`:
```javascript
testTimeout: 60000  // 60 seconds
```

### Module resolution errors
Check ESM imports use `.js` extension:
```javascript
import { foo } from './module.js';  // ✓ Correct
import { foo } from './module';     // ✗ Wrong
```

### Mock not working
Verify mock path is correct and called before imports:
```javascript
jest.unstable_mockModule('./module.js', () => ({
  myFunction: jest.fn()
}));

// Then import
const { myFunction } = await import('./module.js');
```

## Contributing

When adding new features:
1. Write unit tests first (TDD)
2. Add integration tests for workflows
3. Update test documentation
4. Ensure coverage meets thresholds
5. Run full test suite before PR

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [TDD Guide](https://martinfowler.com/bliki/TestDrivenDevelopment.html)