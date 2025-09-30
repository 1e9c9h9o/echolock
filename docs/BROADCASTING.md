# Bitcoin Transaction Broadcasting

This document describes the safe transaction broadcasting feature for ECHOLOCK's Bitcoin timelock integration.

## ⚠️ Important Warning

**TESTNET ONLY** - Broadcasting transactions consumes real testnet Bitcoin. Ensure timelock logic is correct before enabling mainnet support. **NEVER enable mainnet without professional security audit.**

## Overview

The broadcasting system provides production-grade safeguards for releasing funds from Bitcoin timelock addresses:

- **Transaction validation** - Verifies transaction structure before broadcast
- **Safety limits** - Enforces maximum amounts and minimum timelock ages
- **User confirmation** - Requires explicit approval and password re-entry
- **Retry logic** - Handles network failures with exponential backoff
- **Transaction monitoring** - Tracks confirmation status
- **Audit trail** - Logs all broadcast attempts

## Safety Limits

```javascript
const SAFETY_LIMITS = {
  MAX_TESTNET_AMOUNT_SATS: 1_000_000,    // 0.01 tBTC maximum
  MIN_BLOCKS_PAST_TIMELOCK: 10,          // Must be 10+ blocks past expiry
  MIN_CONFIRMATIONS: 1,                  // Wait for 1+ confirmations
};
```

## Usage

### Dry Run (Default)

By default, all broadcasts are simulated (dry run):

```javascript
import { safeBroadcast } from './src/bitcoin/broadcastManager.js';

const result = await safeBroadcast({
  txHex: signedTransactionHex,
  switchId: 'switch-123',
  txDetails: {
    destinationAddress: 'tb1q...',
    amount: 50000,           // sats
    fee: 1000,              // sats
    feeRate: 10,            // sat/vB
    inputs: 1,
    outputs: 1,
    locktime: 2500000
  },
  password: 'user-password',
  dryRun: true              // Validates but doesn't broadcast
});
```

### Live Broadcast

To broadcast for real, set `dryRun: false` and confirm prompts:

```javascript
const result = await safeBroadcast({
  txHex: signedTransactionHex,
  switchId: 'switch-123',
  txDetails: { /* ... */ },
  password: 'user-password',
  dryRun: false              // ⚠️ REAL BROADCAST
});

// User will be prompted:
// - Display transaction details
// - "Broadcast this transaction? yes/NO"
// - "Enter password to confirm broadcast:"
```

### Safety Checks Performed

The system performs these checks before broadcasting:

1. **Destination Address Validation**
   - Verifies valid testnet address format
   - Prevents sending to invalid/mainnet addresses

2. **Amount Validation**
   - Enforces MAX_TESTNET_AMOUNT_SATS limit
   - Prevents accidentally broadcasting large amounts

3. **Timelock Age Validation**
   - Requires MIN_BLOCKS_PAST_TIMELOCK blocks past expiry
   - Prevents premature broadcast attempts
   - Accounts for blockchain reorganizations

4. **Transaction Structure Validation**
   - Verifies valid hex encoding
   - Checks transaction has inputs and outputs
   - Validates transaction can be decoded

### Transaction Monitoring

After broadcasting, monitor transaction status:

```javascript
import { monitorTransaction } from './src/bitcoin/broadcastManager.js';

const result = await monitorTransaction(
  'abc123...', // txid
  'switch-123'  // switchId
);

// Polls every 30 seconds for up to 1 hour
// Logs to audit trail when confirmed
```

### Audit Trail

All broadcast attempts are logged to `data/tx-history.json`:

```json
{
  "transactions": [
    {
      "switchId": "switch-123",
      "txid": "abc123...",
      "destinationAddress": "tb1q...",
      "amount": 50000,
      "fee": 1000,
      "locktime": 2500000,
      "currentHeight": 2500050,
      "confirmationUrl": "https://blockstream.info/testnet/tx/abc123...",
      "status": "broadcasted",
      "timestamp": "2025-01-15T12:00:00.000Z"
    }
  ]
}
```

View transaction history:

```javascript
import { getTransactionHistory } from './src/bitcoin/broadcastManager.js';

const history = await getTransactionHistory();
console.log(history);
```

## API Reference

### `safeBroadcast(params)`

Safely broadcast a Bitcoin transaction with comprehensive validation.

**Parameters:**
- `txHex` (string) - Raw signed transaction hex
- `switchId` (string) - Switch ID for audit trail
- `txDetails` (object) - Transaction details:
  - `destinationAddress` (string) - Recipient address
  - `amount` (number) - Amount in satoshis
  - `fee` (number) - Fee in satoshis
  - `feeRate` (number) - Fee rate in sat/vB
  - `inputs` (number) - Number of inputs
  - `outputs` (number) - Number of outputs
  - `locktime` (number) - Timelock value
- `password` (string) - User password for confirmation
- `dryRun` (boolean) - If true, validate but don't broadcast (default: true)

**Returns:** Promise<Object>
```javascript
{
  success: true,
  dryRun: false,
  txid: 'abc123...',
  confirmationUrl: 'https://blockstream.info/testnet/tx/abc123...',
  broadcastedAt: '2025-01-15T12:00:00.000Z',
  checks: {
    destinationAddress: { valid: true },
    amount: { valid: true },
    timelockAge: { valid: true, age: '50 blocks' },
    txHex: { valid: true, length: 500 }
  }
}
```

### `monitorTransaction(txid, switchId)`

Monitor transaction confirmation status.

**Parameters:**
- `txid` (string) - Transaction ID to monitor
- `switchId` (string) - Switch ID for audit trail

**Returns:** Promise<Object>
```javascript
{
  success: true,
  confirmed: true,
  confirmations: 6,
  blockHeight: 2500105,
  blockHash: '000000...',
  blockTime: 1705320000
}
```

### `getTransactionHistory()`

Get transaction history from audit log.

**Returns:** Promise<Array<Object>>

## testnetClient.js Functions

### `broadcastTransaction(txHex, options)`

Low-level broadcast function with retry logic.

**Parameters:**
- `txHex` (string) - Raw transaction hex
- `options` (object) - Optional:
  - `maxRetries` (number) - Max retry attempts (default: 3)
  - `initialDelay` (number) - Initial delay in ms (default: 1000)

**Returns:** Promise<Object>
```javascript
{
  success: true,
  txid: 'abc123...',
  confirmationUrl: 'https://blockstream.info/testnet/tx/abc123...',
  network: 'testnet',
  broadcastedAt: '2025-01-15T12:00:00.000Z',
  attempt: 1
}
```

**Retry behavior:**
- Exponential backoff: `initialDelay * 2^attempt`
- Non-retryable errors:
  - `bad-txns-inputs-missingorspent`
  - `txn-already-in-mempool`
  - `txn-mempool-conflict`

### `waitForConfirmation(txid, minConfirmations, pollInterval, maxWaitTime)`

Wait for transaction to reach minimum confirmations.

**Parameters:**
- `txid` (string) - Transaction ID
- `minConfirmations` (number) - Min confirmations (default: 1)
- `pollInterval` (number) - Poll interval in ms (default: 30000)
- `maxWaitTime` (number) - Max wait in ms (default: 3600000)

**Returns:** Promise<Object>
```javascript
{
  confirmed: true,
  confirmations: 1,
  blockHeight: 2500105,
  blockHash: '000000...',
  blockTime: 1705320000
}
```

### `getTransactionStatus(txid)`

Get current transaction status.

**Parameters:**
- `txid` (string) - Transaction ID

**Returns:** Promise<Object>
```javascript
{
  status: 'confirmed',        // 'not_found' | 'pending' | 'confirming' | 'confirmed'
  txid: 'abc123...',
  confirmed: true,
  confirmations: 6,
  blockHeight: 2500105,
  blockHash: '000000...',
  blockTime: 1705320000,
  fee: 1000,
  size: 200,
  weight: 500
}
```

## Testing

### Unit/Integration Tests (Safe)

Uses VCR-style fixtures to replay recorded API responses:

```bash
# Run tests with mocked network calls
npm test tests/integration/broadcasting.test.js
```

### Manual Testing on Testnet

**⚠️ WARNING: This consumes real testnet Bitcoin**

1. Create a switch with Bitcoin timelock:
   ```bash
   npm run cli -- create --bitcoin
   ```

2. Fund the timelock address using a testnet faucet:
   - https://testnet-faucet.mempool.co/
   - https://bitcoinfaucet.uo1.net/

3. Wait for timelock to expire + 10 blocks (~100 minutes)

4. Prepare test environment:
   ```bash
   export ECHOLOCK_USE_REAL_NETWORK=true
   export ECHOLOCK_TEST_SWITCH_ID="your-switch-id"
   export ECHOLOCK_TEST_PASSWORD="your-password"
   ```

5. Test dry run (safe):
   ```bash
   npm run cli -- release $ECHOLOCK_TEST_SWITCH_ID --dry-run
   ```

6. Test real broadcast (consumes testnet Bitcoin):
   ```bash
   npm run cli -- release $ECHOLOCK_TEST_SWITCH_ID --broadcast
   ```

### Recording New Fixtures

To record new test fixtures from real API responses:

```bash
export ECHOLOCK_RECORD_FIXTURES=true
npm test tests/integration/broadcasting.test.js
```

Fixtures are saved to `tests/fixtures/broadcast/`.

## Error Handling

### Common Errors

**"Invalid testnet address"**
- Destination address is malformed or mainnet address
- Solution: Verify address starts with `tb1` or `2N/2M`

**"Amount exceeds maximum testnet limit"**
- Transaction amount > 0.01 tBTC (1,000,000 sats)
- Solution: Reduce amount or adjust SAFETY_LIMITS

**"Timelock not yet valid"**
- Current block height < timelock height
- Solution: Wait for more blocks

**"Timelock expired only X blocks ago. Minimum required: 10 blocks"**
- Timelock recently expired, not enough safety margin
- Solution: Wait for 10+ blocks past expiry

**"Broadcast failed: bad-txns-inputs-missingorspent"**
- Transaction inputs already spent or don't exist
- Solution: Verify UTXO is unspent and address is funded

**"Broadcast failed: txn-already-in-mempool"**
- Transaction already broadcast
- Solution: Check mempool for txid

**"Transaction not confirmed after 3600s"**
- Transaction pending for over 1 hour
- Solution: Check fee rate, may need to wait longer or RBF

## Security Considerations

1. **Testnet Only**
   - Current implementation is for testnet ONLY
   - Mainnet requires professional security audit
   - Different SAFETY_LIMITS needed for mainnet

2. **Key Management**
   - Private keys encrypted with user password
   - Password required for broadcast confirmation
   - Keys never logged or stored unencrypted

3. **Amount Limits**
   - MAX_TESTNET_AMOUNT_SATS prevents large transactions
   - Adjust for mainnet based on risk tolerance
   - Consider implementing multi-sig for large amounts

4. **Timelock Safety**
   - MIN_BLOCKS_PAST_TIMELOCK prevents premature spending
   - Accounts for blockchain reorganizations
   - Consider increasing for mainnet (20-50 blocks)

5. **User Confirmation**
   - Explicit "yes" required (not just Enter)
   - Password re-entry prevents accidental broadcasts
   - Transaction details displayed before confirmation

6. **Audit Trail**
   - All broadcasts logged to tx-history.json
   - Includes success and failure attempts
   - Preserves evidence for security analysis

## Future Enhancements

- [ ] RBF (Replace-By-Fee) support for stuck transactions
- [ ] CPFP (Child-Pays-For-Parent) support
- [ ] Multi-signature timelock support
- [ ] Hardware wallet integration
- [ ] Mainnet support (after audit)
- [ ] Email/SMS notifications on confirmation
- [ ] Web interface for transaction monitoring
- [ ] Integration with Lightning Network for faster releases

## See Also

- [Bitcoin Integration](./BITCOIN_INTEGRATION.md) - Overall Bitcoin architecture
- [Timelock Scripts](./TIMELOCK_SCRIPTS.md) - OP_CHECKLOCKTIMEVERIFY details
- [Testing Guide](./TESTING.md) - Comprehensive testing procedures