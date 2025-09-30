# Bitcoin Transaction Broadcasting - Quick Start Guide

This guide walks you through using ECHOLOCK's safe Bitcoin transaction broadcasting feature.

## ⚠️ CRITICAL WARNING

**TESTNET ONLY** - Broadcasting transactions consumes real testnet Bitcoin. Ensure timelock logic is correct before enabling mainnet. **NEVER enable mainnet without professional security audit.**

## Features

✅ **Transaction validation** - Verifies structure before broadcast
✅ **Safety limits** - Max 0.01 tBTC, min 10 blocks past expiry
✅ **User confirmation** - Explicit approval + password re-entry
✅ **Retry logic** - Exponential backoff (3 attempts)
✅ **Transaction monitoring** - Track confirmation status
✅ **Audit trail** - Logs all broadcasts to `data/tx-history.json`
✅ **Dry run mode** - Validate without broadcasting (default)

## Quick Start

### 1. Create a Switch with Bitcoin Timelock

```bash
npm run cli -- create --bitcoin
```

This creates a dead man's switch with Bitcoin timelock integration. Note the switch ID.

### 2. Fund the Timelock Address

Get testnet Bitcoin from a faucet:
- https://testnet-faucet.mempool.co/
- https://bitcoinfaucet.uo1.net/

Send ~0.001 tBTC to the timelock address shown during creation.

### 3. Wait for Timelock to Expire

Wait for:
- Switch to expire (based on your configured duration)
- Current block height >= timelock height + 10 blocks

Check status:
```bash
npm run cli -- status <switch-id>
```

### 4. Test Release (Dry Run)

Validate transaction without broadcasting:

```bash
npm run test-release <switch-id>
```

This performs all safety checks and shows transaction details but does **NOT** broadcast.

### 5. Real Broadcast

After successful dry run, broadcast for real:

```bash
npm run test-release <switch-id> --broadcast
```

You will be prompted to:
1. Review transaction details
2. Confirm broadcast: type `yes` (not just Enter)
3. Re-enter password for verification

### 6. Monitor Confirmation

The script automatically monitors confirmation. Alternatively:

```bash
# View on Blockstream explorer
https://blockstream.info/testnet/tx/YOUR_TXID

# Check audit log
cat data/tx-history.json
```

## Command Reference

### Test Release Command

```bash
npm run test-release <switch-id> [options]
```

**Options:**
- `--broadcast` - Broadcast to network (default: dry run)
- `--help` - Show help message

**Examples:**

```bash
# Dry run (safe - validates only)
npm run test-release switch-abc123

# Real broadcast (requires confirmation)
npm run test-release switch-abc123 --broadcast
```

## Safety Checks Performed

Every broadcast performs these checks:

1. ✅ **Destination Address** - Valid testnet format
2. ✅ **Amount Limit** - Maximum 0.01 tBTC (1,000,000 sats)
3. ✅ **Timelock Age** - Minimum 10 blocks past expiry
4. ✅ **Transaction Structure** - Valid hex, inputs, outputs

## Transaction Flow

```
┌──────────────────────────────────────────┐
│ 1. Load Switch & Check Status           │
│    - Switch exists?                      │
│    - Bitcoin enabled?                    │
│    - Switch expired?                     │
│    - Timelock valid?                     │
└──────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│ 2. Validate Configuration                │
│    - 10+ blocks past expiry?             │
│    - Address valid?                      │
└──────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│ 3. Authenticate                          │
│    - Prompt for password                 │
│    - Decrypt private key                 │
└──────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│ 4. Create Transaction                    │
│    - Fetch UTXOs                         │
│    - Select inputs                       │
│    - Calculate fees                      │
│    - Sign transaction                    │
└──────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│ 5. Safety Checks                         │
│    - Validate destination                │
│    - Check amount limit                  │
│    - Verify timelock age                 │
│    - Confirm transaction hex             │
└──────────────────────────────────────────┘
                  ↓
           DRY RUN MODE?
              /    \
            YES     NO
             ↓       ↓
         COMPLETE  Continue
                     ↓
┌──────────────────────────────────────────┐
│ 6. User Confirmation                     │
│    - Display tx details                  │
│    - Prompt: "Broadcast? yes/NO"         │
│    - Re-enter password                   │
└──────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│ 7. Broadcast                             │
│    - POST to Blockstream API             │
│    - Retry on failure (3 attempts)       │
│    - Log to audit trail                  │
└──────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│ 8. Monitor Confirmation (Optional)       │
│    - Poll every 30 seconds              │
│    - Wait up to 1 hour                  │
│    - Update audit trail                 │
└──────────────────────────────────────────┘
```

## Testing

### Unit/Integration Tests (Safe)

Uses VCR-style fixtures (no real network):

```bash
# Run broadcasting tests
npm run test:broadcast

# Run all tests
npm test
```

### Manual Testing on Testnet

**⚠️ WARNING: Consumes real testnet Bitcoin**

```bash
# 1. Set up test environment
export ECHOLOCK_USE_REAL_NETWORK=true
export ECHOLOCK_TEST_SWITCH_ID="your-switch-id"
export ECHOLOCK_TEST_PASSWORD="your-password"

# 2. Dry run (safe)
npm run test-release $ECHOLOCK_TEST_SWITCH_ID

# 3. Real broadcast (consumes testnet Bitcoin)
npm run test-release $ECHOLOCK_TEST_SWITCH_ID --broadcast
```

## API Documentation

### broadcastManager.js

```javascript
import { safeBroadcast, monitorTransaction, getTransactionHistory }
  from './src/bitcoin/broadcastManager.js';

// Safe broadcast with validation
const result = await safeBroadcast({
  txHex: '020000...',
  switchId: 'switch-123',
  txDetails: {
    destinationAddress: 'tb1q...',
    amount: 50000,
    fee: 1000,
    feeRate: 10,
    inputs: 1,
    outputs: 1,
    locktime: 2500000
  },
  password: 'user-password',
  dryRun: true  // false for real broadcast
});

// Monitor confirmation
const status = await monitorTransaction('txid', 'switch-123');

// View history
const history = await getTransactionHistory();
```

### testnetClient.js

```javascript
import {
  broadcastTransaction,
  waitForConfirmation,
  getTransactionStatus
} from './src/bitcoin/testnetClient.js';

// Low-level broadcast (with retry logic)
const result = await broadcastTransaction(txHex, {
  maxRetries: 3,
  initialDelay: 1000
});

// Wait for confirmation
const confirmation = await waitForConfirmation(
  txid,
  1,      // min confirmations
  30000,  // poll interval (ms)
  3600000 // max wait time (ms)
);

// Check status
const status = await getTransactionStatus(txid);
```

## Audit Trail

All broadcasts are logged to `data/tx-history.json`:

```json
{
  "transactions": [
    {
      "switchId": "switch-abc123",
      "txid": "abc123def456...",
      "destinationAddress": "tb1qeg829dt9...",
      "amount": 50000,
      "fee": 1000,
      "locktime": 2500000,
      "currentHeight": 2500050,
      "confirmationUrl": "https://blockstream.info/testnet/tx/abc123...",
      "status": "broadcasted",
      "timestamp": "2025-01-15T12:00:00.000Z"
    },
    {
      "switchId": "switch-abc123",
      "txid": "abc123def456...",
      "status": "confirmed",
      "blockHeight": 2500051,
      "blockHash": "000000...",
      "confirmations": 1,
      "timestamp": "2025-01-15T12:10:00.000Z"
    }
  ]
}
```

## Troubleshooting

### "Invalid testnet address"
- Address must be valid testnet format (starts with `tb1` or `2N/2M`)
- Check you didn't accidentally use mainnet address

### "Amount exceeds maximum testnet limit"
- Maximum allowed: 0.01 tBTC (1,000,000 sats)
- Split into multiple transactions or adjust limit

### "Timelock expired only X blocks ago. Minimum required: 10 blocks"
- Safety margin to prevent blockchain reorg issues
- Wait for more blocks to pass

### "Broadcast failed: bad-txns-inputs-missingorspent"
- UTXO already spent or doesn't exist
- Verify address is funded and UTXO unspent

### "Transaction not confirmed after 3600s"
- Fee too low or network congestion
- Check explorer for status
- Consider RBF (Replace-By-Fee) in future version

## Security Considerations

1. **Testnet Only**
   - Current implementation is TESTNET ONLY
   - Mainnet requires professional security audit

2. **Private Key Security**
   - Keys encrypted with user password
   - Password required for broadcast
   - Keys never logged or stored unencrypted

3. **Amount Limits**
   - 0.01 tBTC max prevents large losses
   - Adjust for mainnet based on risk tolerance

4. **Timelock Safety Margin**
   - 10 blocks minimum prevents reorg issues
   - Consider 20-50 blocks for mainnet

5. **User Confirmation**
   - Explicit "yes" required (not just Enter)
   - Password re-entry prevents accidents

## File Structure

```
src/bitcoin/
├── testnetClient.js        # Low-level API client
├── broadcastManager.js     # Safe broadcasting + validation
├── timelockSpender.js      # Transaction creation
└── constants.js            # Network configuration

src/cli/
└── testRelease.js          # CLI interface

tests/
├── integration/
│   └── broadcasting.test.js    # VCR-style tests
└── fixtures/
    └── broadcast/
        ├── README.md
        └── broadcast-success.json

docs/
└── BROADCASTING.md         # Detailed documentation

data/
└── tx-history.json         # Audit trail
```

## Related Documentation

- [BROADCASTING.md](docs/BROADCASTING.md) - Full API reference
- [BITCOIN_INTEGRATION.md](docs/BITCOIN_INTEGRATION.md) - Architecture overview
- [TESTING.md](docs/TESTING.md) - Testing procedures

## Support

For issues or questions:
- Check `docs/BROADCASTING.md` for detailed documentation
- Review `tests/integration/broadcasting.test.js` for examples
- Examine `data/tx-history.json` for audit trail

## License

See LICENSE file for details.