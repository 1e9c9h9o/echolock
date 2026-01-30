# Functional Fixes - January 2026

This document summarizes the functional fixes made to address gaps identified in the EchoLock codebase (excluding security audit items).

## Overview

A comprehensive analysis identified several functional gaps in the system. These have been prioritized and fixed as follows:

---

## P0 Fixes (Critical)

### 1. Passwordless Fragment Recovery Fixed

**File**: `src/core/deadManSwitch.js`

**Problem**: Users with v1 (passwordless) switches could not recover their messages from Nostr because the fragment encryption key was randomly generated but never stored.

**Solution**: For v1 mode, the fragment encryption key is now derived deterministically from the Nostr private key using HMAC:

```javascript
fragmentEncryptionKey = crypto.createHmac('sha256', fragmentEncryptionSalt)
  .update(nostrKeyBuffer)
  .update(Buffer.from('ECHOLOCK-V1-FRAGMENT-KEY'))
  .digest();
```

This ensures the key is recoverable since the Nostr private key is stored for v1 mode.

**Impact**: Passwordless switches now work correctly for both creation and recovery.

---

### 2. Silent Local Fallback Fixed

**File**: `src/core/deadManSwitch.js`

**Problem**: When Nostr distribution failed, the system silently fell back to local storage without informing the user. This could lead to users thinking their switch was decentralized when it was actually only stored locally.

**Solution**: The fallback now:
- Logs a clear error message
- Sets `nostrFailed: true` and `nostrError` in the distribution info
- Includes a warning message explaining the security implications
- Returns this information to the caller so the UI can display it

**Impact**: Users are now informed when their switch relies only on local storage.

---

## P1 Fixes (Significant)

### 3. Multi-Relay Publish Tracking

**File**: `src/nostr/multiRelayClient.js`

**Problem**: The `publishToRelays` function used an all-or-nothing approach - if any relay failed, all relays were marked as failed. This caused false failures even when most relays succeeded.

**Solution**: Implemented per-relay tracking:
- Each relay is published to individually with its own timeout
- Success/failure is tracked per relay
- Results now include `totalAttempted` count
- Error messages list which specific relays failed

**Impact**: More accurate relay status reporting and fewer false failures.

---

### 4. Guardian Acknowledgment Flow

**File**: `frontend/components/GuardianManager.tsx`

**Problem**: The guardian management UI showed status but had no mechanism to:
- Poll for guardian acknowledgments
- Update guardian status when ACKs were received
- Provide manual refresh capability

**Solution**: Added:
- `useEffect` hook that polls for ACKs every 30 seconds
- Integration with existing `queryGuardianAcks` function
- Visual indicator showing ACK check status
- Manual "Refresh" button for immediate ACK checking
- Automatic status update when ACKs are received

**Impact**: Users can now see when guardians accept their invitations.

---

## P2 Fixes (Should Fix)

### 5. Relay Recovery Mechanism

**File**: `src/nostr/relayHealthCheck.js`

**Problem**: Relays in backoff state were never automatically recovered. Once a relay failed, it stayed in backoff indefinitely, reducing network redundancy over time.

**Solution**: Added:
- Configuration for max failures (10) and recovery interval (10 minutes)
- `lastRecoveryAttempt` tracking per relay
- Automatic recovery attempts for relays that have been failing too long
- New `attemptRelayRecovery()` function for manual recovery
- New `getRelayHealthStats()` function for monitoring

**Impact**: Failed relays are automatically retried, maintaining network redundancy.

---

### 6. Bitcoin Transaction Rebroadcast

**File**: `src/bitcoin/timelockSpender.js`

**Problem**: Bitcoin transactions were created but there was no:
- Broadcasting mechanism
- Transaction monitoring
- Rebroadcast logic for dropped transactions

**Solution**: Added three new functions:

1. `broadcastTransaction(txHex)` - Broadcasts to multiple services (mempool.space, blockstream.info) for redundancy

2. `checkTransactionStatus(txid)` - Checks if a transaction is in mempool, confirmed, or dropped

3. `monitorAndRebroadcast(txHex, txid, options)` - Monitors transaction status and automatically rebroadcasts if dropped, with exponential backoff

**Impact**: Timelock transactions are more reliable and won't fail silently if dropped from mempool.

---

## P3 Fixes (Nice to Have)

### 7. Dead Coordinator Code Removed

**Files**:
- Removed: `src/core/coordinator.js`
- Updated: `tests/unit/basic.test.js`

**Problem**: The coordinator module contained unused placeholder code with unimplemented methods that all threw "Not implemented" errors.

**Solution**: Deleted the unused module and updated tests to reflect the removal.

**Impact**: Cleaner codebase with less confusion about unused code.

---

## Testing the Fixes

### Verify Passwordless Recovery
```bash
# Create a switch without password
npm run cli -- create --no-password --message "Test message"

# Release should now work
npm run cli -- release <switch-id>
```

### Verify Relay Tracking
```bash
# Check publish results now show per-relay status
npm run test -- --grep "multi-relay"
```

### Verify Guardian ACKs
1. Open the frontend
2. Add a guardian to a switch
3. Observe the "Checking for acknowledgments..." status
4. Use the Refresh button to manually check

---

## Remaining Work

1. **P3: Guardian Monitoring UI** - Full dashboard showing guardian health/status
2. **Security Audit** - Separate track, not covered here

---

## Summary

| Priority | Fix | Status |
|----------|-----|--------|
| P0 | Passwordless fragment recovery | Complete |
| P0 | Silent local fallback warning | Complete |
| P1 | Multi-relay publish tracking | Complete |
| P1 | Guardian acknowledgment flow | Complete |
| P2 | Relay recovery mechanism | Complete |
| P2 | Bitcoin tx rebroadcast | Complete |
| P3 | Remove dead coordinator | Complete |
| P3 | Guardian monitoring UI | Pending |

All critical (P0) and significant (P1) fixes have been implemented.
