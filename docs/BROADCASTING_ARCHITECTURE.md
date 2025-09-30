# Bitcoin Broadcasting Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ECHOLOCK BROADCASTING                        │
│                     Production-Grade Safeguards                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 1: USER INTERFACE                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  src/cli/testRelease.js                                              │
│  ├─ Parse command line arguments                                     │
│  ├─ Display switch status                                            │
│  ├─ Prompt for password                                              │
│  ├─ Show transaction details                                         │
│  └─ Monitor confirmation                                             │
│                                                                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 2: SAFETY & VALIDATION                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  src/bitcoin/broadcastManager.js                                     │
│  ├─ Safety Check 1: Destination Address Validation                  │
│  │   └─ isValidTestnetAddress()                                     │
│  ├─ Safety Check 2: Amount Validation                               │
│  │   └─ validateAmount() ≤ 0.01 tBTC                               │
│  ├─ Safety Check 3: Timelock Age Validation                         │
│  │   └─ validateTimelockAge() ≥ 10 blocks past expiry              │
│  ├─ Safety Check 4: Transaction Hex Validation                      │
│  │   └─ validateTransactionHex()                                    │
│  ├─ User Confirmation Workflow                                       │
│  │   ├─ Display transaction details                                 │
│  │   ├─ Prompt: "Broadcast? yes/NO"                                │
│  │   └─ Require password re-entry                                   │
│  └─ Audit Trail Management                                          │
│      ├─ appendToAuditLog()                                          │
│      └─ getTransactionHistory()                                     │
│                                                                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 3: TRANSACTION CREATION                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  src/bitcoin/timelockSpender.js                                      │
│  ├─ Fetch UTXOs from timelock address                               │
│  ├─ Select inputs (coin selection)                                   │
│  ├─ Calculate fees (sat/vB × size)                                  │
│  ├─ Create PSBT (Partially Signed Bitcoin Transaction)              │
│  ├─ Set locktime and sequence for OP_CHECKLOCKTIMEVERIFY            │
│  ├─ Sign inputs with private key                                     │
│  └─ Finalize and extract raw transaction hex                        │
│                                                                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 4: NETWORK COMMUNICATION                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  src/bitcoin/testnetClient.js                                        │
│  ├─ broadcastTransaction()                                           │
│  │   ├─ Attempt 1: POST to Blockstream API                         │
│  │   │   ├─ Success → return { txid, confirmationUrl }            │
│  │   │   └─ Failure → check error type                            │
│  │   ├─ If retryable error:                                        │
│  │   │   ├─ Wait 1s (exponential backoff)                         │
│  │   │   └─ Attempt 2: POST again                                 │
│  │   └─ If still failing:                                          │
│  │       ├─ Wait 2s                                                │
│  │       └─ Attempt 3: Final retry                                │
│  ├─ waitForConfirmation()                                           │
│  │   └─ Poll every 30s for up to 1 hour                           │
│  └─ getTransactionStatus()                                          │
│      └─ GET /tx/{txid} from Blockstream API                        │
│                                                                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 5: BITCOIN NETWORK                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Blockstream Testnet API                                             │
│  └─ https://blockstream.info/testnet/api                            │
│      ├─ POST /tx (broadcast)                                        │
│      ├─ GET /tx/{txid} (status)                                    │
│      └─ GET /blocks/tip/height (current height)                    │
│                                                                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│  LAYER 6: BLOCKCHAIN                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Bitcoin Testnet                                                     │
│  ├─ Mempool (pending transactions)                                   │
│  ├─ Miners (confirm transactions)                                    │
│  └─ Blocks (permanent record)                                        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Dry Run Mode (Default)

```
User Input → testRelease.js
               ↓
         Load switch data
               ↓
         Verify status (expired? timelock valid?)
               ↓
         Decrypt private key
               ↓
         Create signed transaction
               ↓
         Run safety checks (broadcastManager.safeBroadcast)
               ├─ ✓ Address valid
               ├─ ✓ Amount within limit
               ├─ ✓ Timelock age sufficient
               └─ ✓ Transaction hex valid
               ↓
         Display results
               ↓
         "Dry run complete - use --broadcast to execute"
```

### 2. Live Broadcast Mode

```
User Input → testRelease.js --broadcast
               ↓
         [Same validation steps as dry run]
               ↓
         Display transaction details
               ↓
         Prompt user: "Broadcast? yes/NO"
               ↓ (user types "yes")
         Prompt for password re-entry
               ↓ (password matches)
         broadcastManager.safeBroadcast (dryRun: false)
               ↓
         testnetClient.broadcastTransaction
               ├─ Attempt 1 (immediate)
               ├─ Attempt 2 (after 1s if failed)
               └─ Attempt 3 (after 2s if failed)
               ↓
         ✓ Transaction broadcast successful
               ↓
         Log to audit trail (data/tx-history.json)
               ↓
         Monitor confirmation (optional)
               ├─ Poll every 30s
               └─ Wait up to 1 hour
               ↓
         ✓ Transaction confirmed
               ↓
         Update audit trail with confirmation details
```

## Component Interactions

```
┌──────────────┐
│ CLI Tool     │
│ testRelease  │
└──────┬───────┘
       │ calls
       ↓
┌──────────────────────────────┐
│ Broadcast Manager            │
│ ├─ safeBroadcast()          │ ←─── Main entry point
│ ├─ validateDestination()    │
│ ├─ validateAmount()         │
│ ├─ validateTimelockAge()    │
│ ├─ monitorTransaction()     │
│ └─ appendToAuditLog()       │
└──────┬───────────────────────┘
       │ calls
       ↓
┌──────────────────────────────┐
│ Testnet Client               │
│ ├─ broadcastTransaction()   │ ←─── Retry logic
│ ├─ waitForConfirmation()    │
│ ├─ getTransactionStatus()   │
│ ├─ getCurrentBlockHeight()  │
│ └─ isValidTestnetAddress()  │
└──────┬───────────────────────┘
       │ HTTP
       ↓
┌──────────────────────────────┐
│ Blockstream API              │
│ (Bitcoin Testnet)            │
└──────────────────────────────┘
```

## Safety Checks Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                      SAFETY CHECK PIPELINE                       │
└─────────────────────────────────────────────────────────────────┘

Input: { txHex, switchId, txDetails, password, dryRun }
   ↓
┌─────────────────────┐
│ Check 1: Address    │ → isValidTestnetAddress()
│ ✓ Valid testnet?    │    └─ bitcoin.address.toOutputScript()
│ ✗ Mainnet/invalid?  │
└──────┬──────────────┘
       │ PASS
       ↓
┌─────────────────────┐
│ Check 2: Amount     │ → validateAmount()
│ ✓ ≤ 1,000,000 sats? │    └─ amount ≤ MAX_TESTNET_AMOUNT_SATS
│ ✗ Exceeds limit?    │
└──────┬──────────────┘
       │ PASS
       ↓
┌─────────────────────┐
│ Check 3: Timelock   │ → validateTimelockAge()
│ ✓ ≥ 10 blocks past? │    ├─ getCurrentBlockHeight()
│ ✗ Too recent?       │    └─ blocksPast ≥ MIN_BLOCKS_PAST_TIMELOCK
└──────┬──────────────┘
       │ PASS
       ↓
┌─────────────────────┐
│ Check 4: Tx Hex     │ → validateTransactionHex()
│ ✓ Valid structure?  │    ├─ Buffer.from(txHex, 'hex')
│ ✗ Invalid hex?      │    └─ bitcoin.Transaction.fromBuffer()
└──────┬──────────────┘
       │ PASS
       ↓
┌─────────────────────┐
│ Display Details     │
│ • Destination       │
│ • Amount            │
│ • Fee               │
│ • Locktime          │
└──────┬──────────────┘
       │
       ├─ If dryRun: true  → ✓ Validation complete (exit)
       │
       └─ If dryRun: false → Continue
          ↓
┌─────────────────────┐
│ User Confirmation   │
│ Prompt: yes/NO?     │ → readline prompt
└──────┬──────────────┘
       │ "yes"
       ↓
┌─────────────────────┐
│ Password Re-entry   │
│ Verify password     │ → Must match original
└──────┬──────────────┘
       │ MATCH
       ↓
┌─────────────────────┐
│ Broadcast!          │ → testnetClient.broadcastTransaction()
└──────┬──────────────┘
       │
       ├─ Success → Log to audit trail
       └─ Failure → Log error to audit trail
```

## Retry Logic Flow

```
broadcastTransaction(txHex)
   ↓
┌──────────────────────────────────────┐
│ Attempt 1 (immediate)                │
│ POST /tx to Blockstream API          │
└────┬─────────────────────────┬───────┘
     │ Success                 │ Failure
     ↓                         ↓
  Return                 Check Error Type
  { txid,                      ↓
    confirmationUrl }    ┌─────────────────┐
                         │ Non-retryable?  │
                         │ • already-spent │
                         │ • in-mempool    │
                         │ • conflict      │
                         └─────┬─────┬─────┘
                               │ Yes │ No
                               ↓     ↓
                           Throw  Wait 1s
                           Error     ↓
                                ┌────────────────────┐
                                │ Attempt 2          │
                                │ POST /tx again     │
                                └────┬─────────┬─────┘
                                     │ Success │ Fail
                                     ↓         ↓
                                  Return    Wait 2s
                                              ↓
                                        ┌────────────────┐
                                        │ Attempt 3      │
                                        │ Final retry    │
                                        └────┬─────┬─────┘
                                             │ OK  │ Fail
                                             ↓     ↓
                                          Return  Throw
                                                  Error
```

## Audit Trail Structure

```
data/tx-history.json
{
  "transactions": [
    {
      // Broadcast record
      "switchId": "switch-123",
      "txid": "abc123...",
      "destinationAddress": "tb1q...",
      "amount": 50000,
      "fee": 1000,
      "locktime": 2500000,
      "currentHeight": 2500050,
      "confirmationUrl": "https://...",
      "status": "broadcasted",
      "timestamp": "2025-01-15T12:00:00.000Z"
    },
    {
      // Confirmation record
      "switchId": "switch-123",
      "txid": "abc123...",
      "status": "confirmed",
      "blockHeight": 2500051,
      "blockHash": "000000...",
      "confirmations": 1,
      "timestamp": "2025-01-15T12:10:00.000Z"
    },
    {
      // Failure record
      "switchId": "switch-456",
      "destinationAddress": "tb1q...",
      "amount": 30000,
      "locktime": 2500100,
      "status": "failed",
      "error": "bad-txns-inputs-missingorspent",
      "timestamp": "2025-01-15T13:00:00.000Z"
    }
  ]
}
```

## Error Handling

```
Error Occurred
   ↓
┌─────────────────────────────────────────┐
│ Categorize Error                        │
├─────────────────────────────────────────┤
│                                         │
│ Network Errors (retryable)              │
│ ├─ Connection timeout                   │
│ ├─ Connection refused                   │
│ └─ HTTP 500/502/503                     │
│   └─→ Retry with backoff                │
│                                         │
│ Transaction Errors (non-retryable)      │
│ ├─ bad-txns-inputs-missingorspent       │
│ ├─ txn-already-in-mempool               │
│ ├─ txn-mempool-conflict                 │
│ └─ insufficient priority                 │
│   └─→ Throw error immediately           │
│                                         │
│ Validation Errors (pre-broadcast)       │
│ ├─ Invalid address                      │
│ ├─ Amount exceeds limit                 │
│ ├─ Timelock not expired                 │
│ └─ Invalid transaction hex              │
│   └─→ Return { success: false, error }  │
│                                         │
└─────────────────────────────────────────┘
   ↓
Log to audit trail
   ↓
Return/throw to caller
```

## Testing Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         TESTING LAYERS                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Unit Tests                                                        │
│ ├─ Validation functions                                          │
│ │  ├─ validateDestination()                                      │
│ │  ├─ validateAmount()                                           │
│ │  └─ validateTimelockAge()                                      │
│ └─ Utility functions                                             │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Integration Tests (VCR Mode)                                     │
│ ├─ tests/integration/broadcasting.test.js                        │
│ ├─ Fixture Manager (record/replay)                              │
│ │  ├─ Load fixtures from JSON                                    │
│ │  └─ Mock API responses                                         │
│ └─ Test scenarios                                                │
│    ├─ Invalid address rejection                                  │
│    ├─ Amount limit enforcement                                   │
│    ├─ Transaction validation                                     │
│    └─ Fixture loading                                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ Manual Tests (Real Testnet)                                      │
│ ├─ ECHOLOCK_USE_REAL_NETWORK=true                               │
│ ├─ Create real switch                                            │
│ ├─ Fund from faucet                                              │
│ ├─ Wait for expiry                                               │
│ └─ Test dry run and broadcast                                    │
└──────────────────────────────────────────────────────────────────┘
```

## Security Layers

```
┌────────────────────────────────────────────────────────────────┐
│                      SECURITY DEFENSE LAYERS                    │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Layer 1: Input Validation                                       │
│ └─→ Reject malformed inputs before processing                  │
│                                                                  │
│ Layer 2: Amount Limits                                          │
│ └─→ Prevent large accidental broadcasts                        │
│                                                                  │
│ Layer 3: Timelock Age Validation                               │
│ └─→ Prevent premature spending (blockchain reorg protection)   │
│                                                                  │
│ Layer 4: Dry Run Default                                        │
│ └─→ Require explicit --broadcast flag                          │
│                                                                  │
│ Layer 5: User Confirmation                                      │
│ └─→ Display details + require "yes" + password re-entry        │
│                                                                  │
│ Layer 6: Audit Trail                                            │
│ └─→ Log all attempts for forensic analysis                     │
│                                                                  │
│ Layer 7: Network Isolation                                      │
│ └─→ Testnet only, mainnet disabled by design                   │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

## Performance Characteristics

- **Validation**: < 100ms (local checks)
- **Transaction creation**: < 1s (UTXO fetch + signing)
- **Broadcast**: 1-5s (network latency + 3 retries max)
- **Confirmation monitoring**: 10-30 minutes (1+ blocks)
- **Total dry run time**: < 5s
- **Total live broadcast time**: < 1 minute (excluding confirmation)

## Key Design Decisions

1. **Dry run by default**: Prevents accidental broadcasts
2. **Multi-layer validation**: Defense in depth
3. **Exponential backoff**: Graceful network failure handling
4. **VCR-style fixtures**: Fast, deterministic tests without real network
5. **Comprehensive audit trail**: Full accountability
6. **Testnet-only design**: Safety by construction
7. **User confirmation workflow**: Multiple checkpoints before broadcast

## See Also

- [BROADCASTING.md](BROADCASTING.md) - Complete API reference
- [BITCOIN_INTEGRATION.md](BITCOIN_INTEGRATION.md) - Overall Bitcoin architecture
- [BROADCASTING_SETUP.md](../BROADCASTING_SETUP.md) - Quick start guide