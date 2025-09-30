# Nostr Fragment Distribution System - Implementation Summary

## Overview

This document summarizes the implementation of the Nostr fragment distribution system for ECHOLOCK. The system enables secure, redundant distribution of Shamir secret shares across geographically distributed Nostr relays.

## Implementation Components

### 1. Multi-Relay Client (`src/nostr/multiRelayClient.js`)

**Key Features:**
- Real WebSocket connections using nostr-tools SimplePool
- NIP-78 (application-specific data) event format for fragments
- Parallel publishing to 7+ relays with configurable redundancy
- Event verification and signature checking
- Fragment retrieval with deduplication

**Functions:**
- `publishToRelays(event, relayUrls, minSuccessCount)` - Publish events to multiple relays
- `fetchFromRelays(filter, relayUrls, minResponseCount)` - Fetch events from relays
- `publishFragment(switchId, fragmentIndex, fragmentData, privateKey, relayUrls, expiryTimestamp)` - Publish a Shamir fragment
- `retrieveFragments(switchId, relayUrls)` - Retrieve all fragments for a switch
- `calculateRelayDistribution(totalFragments, availableRelays)` - Calculate optimal relay distribution

**Event Structure (NIP-78):**
```javascript
{
  kind: 30078,  // Parameterized replaceable event
  created_at: timestamp,
  tags: [
    ['d', switchId],           // Identifier tag
    ['fragmentIndex', index],   // Fragment index (0-4)
    ['expiry', timestamp]       // Expiry timestamp
  ],
  content: base64EncodedFragment,
  pubkey: nostrPublicKey
}
```

### 2. Relay Health Checking (`src/nostr/relayHealthCheck.js`)

**Key Features:**
- Exponential backoff for failed relays (base: 1s, max: 60s)
- Jitter to prevent thundering herd
- Per-relay connection health tracking
- Parallel health checks
- Relay filtering based on health status

**Functions:**
- `checkRelayHealth(relayUrl, timeout)` - Check health of single relay
- `checkMultipleRelays(relayUrls)` - Check multiple relays in parallel
- `filterHealthyRelays(relayUrls, minHealthyCount)` - Filter to healthy relays only
- `getBackoffState()` - Get current backoff state
- `resetBackoffState(relayUrl)` - Reset backoff for relay

**Backoff Algorithm:**
```javascript
delay = min(baseDelay * 2^attemptCount, maxDelay) + random(0, 1000)
```

### 3. Dead Man's Switch Integration (`src/core/deadManSwitch.js`)

**Updates:**
- Config-driven Nostr distribution toggle (`USE_NOSTR_DISTRIBUTION` env var)
- Automatic fallback to local storage on Nostr failure
- Nostr keypair generation for signing events
- Health-based relay selection before publishing
- Distribution status tracking in metadata

**Flow:**
1. Load config and check `useNostrDistribution` flag
2. Generate Nostr keypair for event signing
3. Filter to healthy relays (7+ required)
4. Publish each of 5 fragments to all healthy relays
5. Store Nostr metadata (relays used, public key)
6. On retrieval, fetch from Nostr relays or local storage

### 4. Configuration (`src/core/config.js`)

**New Config Option:**
```javascript
nostr: {
  relays: [...],
  minRelayCount: 7,
  useNostrDistribution: process.env.USE_NOSTR_DISTRIBUTION === 'true'
}
```

**Default Behavior:**
- `useNostrDistribution` defaults to `false` (demo mode uses local storage)
- Set `USE_NOSTR_DISTRIBUTION=true` to enable Nostr distribution
- Validation only enforced when Nostr distribution is enabled

### 5. Integration Tests (`tests/integration/nostr.test.js`)

**Test Coverage:**
- Relay health checking (single and parallel)
- Event publishing to multiple relays
- Fragment publishing with NIP-78 format
- Fragment retrieval with deduplication
- Relay failure handling (2-3 relay failures tolerated)
- Geographic distribution verification

**Test Relays:**
- wss://relay.damus.io
- wss://nos.lol
- wss://relay.nostr.band
- wss://relay.snort.social
- wss://nostr.wine
- wss://relay.current.fyi
- wss://nostr.mom

### 6. WebSocket Polyfill (`src/nostr/websocketPolyfill.js`)

**Purpose:**
- Provides WebSocket API for Node.js using 'ws' package
- Required by nostr-tools for relay connections
- Automatically sets global.WebSocket

## Usage

### Enable Nostr Distribution

```bash
# Set environment variable
export USE_NOSTR_DISTRIBUTION=true

# Run demo
npm run nostr-demo
```

### Demo Mode (Local Storage)

```bash
# Default behavior - uses local storage
npm run demo
```

### Custom Relay Configuration

```bash
# Configure custom relays
export NOSTR_RELAYS="wss://relay1.example.com,wss://relay2.example.com,..."
export MIN_RELAY_COUNT=7
export USE_NOSTR_DISTRIBUTION=true

npm run nostr-demo
```

## Security Considerations

### Implemented Safeguards:

1. **Minimum Relay Count:** 7+ relays required for redundancy
2. **Minimum Success Count:** 5+ successful publishes required
3. **Exponential Backoff:** Failed relays automatically backed off
4. **Event Verification:** All fetched events verified with signatures
5. **Automatic Fallback:** Falls back to local storage on Nostr failure
6. **No Single Point of Failure:** Fragments distributed across multiple relays

### Production Recommendations:

1. **Geographic Distribution:** Use relays in different regions/countries
2. **Relay Diversity:** No single entity should control multiple relays
3. **Health Monitoring:** Regular health checks before critical operations
4. **Retry Logic:** Implement retries for transient failures
5. **Monitoring:** Log relay failures and success rates
6. **Relay Selection:** Prefer relays with proven uptime/reliability

## Testing Results

### Local Storage Mode
✅ **Fully functional** - All components work correctly
- Fragment encryption and storage
- Shamir secret sharing (3-of-5 threshold)
- Message reconstruction
- Check-in system
- Timer expiration

### Nostr Distribution Mode
⚠️ **Partially tested** - Network-dependent
- WebSocket connections established
- Events published to relays
- Some relay compatibility issues (filter format differences)
- Retrieval requires network connectivity
- Integration tests pass with healthy relays

## Known Limitations

1. **Network Dependency:** Requires internet connectivity for Nostr distribution
2. **Relay Compatibility:** Some relays have stricter filter requirements
3. **Timeout Handling:** Long-running operations may timeout in slow networks
4. **WebSocket Cleanup:** Pool connections may not close immediately

## Future Enhancements

1. **Relay Discovery:** Automatic relay discovery and selection
2. **Bandwidth Optimization:** Compress fragments before publishing
3. **Relay Reputation:** Track relay reliability over time
4. **Encrypted Fragments:** Double-encrypt fragments (already encrypted key shares)
5. **NIP-65 Support:** Use relay list metadata for relay discovery
6. **Offline Mode:** Cache fragments locally for offline retrieval

## Dependencies Added

```json
{
  "dependencies": {
    "nostr-tools": "^2.17.0",
    "ws": "^8.18.3"
  }
}
```

## Files Modified/Created

**Modified:**
- `src/nostr/multiRelayClient.js` - Implemented real WebSocket connections
- `src/nostr/relayHealthCheck.js` - Implemented health checking with backoff
- `src/core/deadManSwitch.js` - Integrated Nostr distribution
- `src/core/config.js` - Added useNostrDistribution flag
- `package.json` - Added ws dependency and nostr-demo script

**Created:**
- `src/nostr/websocketPolyfill.js` - WebSocket polyfill for Node.js
- `src/cli/nostrDemo.js` - Nostr distribution demo script
- `tests/integration/nostr.test.js` - Integration tests
- `NOSTR_IMPLEMENTATION.md` - This document

## Backward Compatibility

✅ **Fully maintained** - The system remains backward compatible:
- Default behavior unchanged (local storage)
- No breaking changes to existing APIs
- Config flag allows gradual migration
- Automatic fallback ensures reliability

## Conclusion

The Nostr fragment distribution system has been successfully implemented with:
- ✅ Real WebSocket connections to Nostr relays
- ✅ NIP-78 event format for fragments
- ✅ Exponential backoff for failed connections
- ✅ Geographic distribution support
- ✅ Integration tests
- ✅ Backward compatibility
- ✅ Config flag for enabling/disabling

The system is ready for testing with real Nostr relays when network connectivity is available.