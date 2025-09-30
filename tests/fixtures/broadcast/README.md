# Broadcasting Test Fixtures

This directory contains VCR-style test fixtures for Bitcoin transaction broadcasting tests.

## What are VCR-style fixtures?

VCR (Video Cassette Recorder) fixtures record real API responses and replay them during tests, providing:

- **Fast tests** - No network latency
- **Deterministic results** - Same responses every time
- **Offline testing** - No internet required
- **Cost-free** - No actual Bitcoin consumed

## Fixture Format

```json
{
  "testName": "broadcast-success",
  "recordedAt": "2025-01-15T12:00:00.000Z",
  "calls": [
    {
      "function": "broadcastTransaction",
      "args": ["tx_hex"],
      "result": { "success": true, "txid": "..." },
      "timestamp": "2025-01-15T12:00:05.000Z"
    }
  ]
}
```

## Recording New Fixtures

To record new fixtures from real testnet:

```bash
export ECHOLOCK_RECORD_FIXTURES=true
npm test tests/integration/broadcasting.test.js
```

**⚠️ Warning:** Recording consumes real testnet Bitcoin. Ensure you have:
1. Funded testnet address
2. Expired timelock (+ 10 blocks)
3. Understanding of costs/risks

## Using Fixtures in Tests

```javascript
import { FixtureManager } from './fixture-helpers.js';

test('should broadcast successfully', async () => {
  const fixtures = new FixtureManager('broadcast-success');
  await fixtures.load();

  // Fixture automatically replays recorded API responses
  const result = await broadcastTransaction('tx_hex');
  expect(result.success).toBe(true);
});
```

## Available Fixtures

- **broadcast-success.json** - Successful broadcast and confirmation
- More fixtures can be added as needed

## Real Network Testing

To bypass fixtures and test against real testnet:

```bash
export ECHOLOCK_USE_REAL_NETWORK=true
npm test tests/integration/broadcasting.test.js
```

See `docs/BROADCASTING.md` for full testing documentation.