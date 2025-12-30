# ECHOLOCK Architecture

> **Read [CLAUDE.md](../CLAUDE.md) first** - It contains the architectural vision and target state.

---

## Critical Notice: Current vs. Target Architecture

This document describes the **current implementation** (v0.x), which is a **centralized prototype**.

| Aspect | Current (v0.x) | Target (v1.0) |
|--------|----------------|---------------|
| Key Generation | Server-side | Client-side only |
| Timer | Database + cron job | Guardian Network + Nostr heartbeats |
| Release Trigger | Server process | Distributed guardian consensus |
| Server Dependency | **Required** | Optional convenience layer |
| Survival | Dies with server | Works without any company |

**The current architecture is a stepping stone, not the destination.**

For the target architecture (Guardian Network, user-controlled keys, autonomous release), see [CLAUDE.md](../CLAUDE.md).

---

## Current Implementation Overview

ECHOLOCK v0.x is a cryptographic dead man's switch that combines Bitcoin timelocks with Nostr protocol for distributed secret storage. **However, the current implementation relies on a central server for all critical operations.**

## Core Concept (Current Implementation)
1. User splits a secret into N shares using Shamir's Secret Sharing (K-of-N threshold)
2. Shares are encrypted and distributed across Nostr relays
3. **Server stores encryption keys and checks timer via cron job**
4. User must periodically "check in" via the server API
5. **Server reconstructs and delivers the message when timer expires**

## Core Concept (Target Architecture - See CLAUDE.md)
1. User generates ALL keys locally (never sent to server)
2. User appoints 5 Guardians who each hold one Shamir share
3. User publishes heartbeats to Nostr (signed with own nsec)
4. Guardians independently watch for heartbeats
5. When heartbeats stop, guardians publish shares to Nostr
6. Recipients reconstruct message from Nostr (no server needed)

---

## System Components

### 1. Cryptographic Layer (`/src/crypto`)
**Security Boundary**: ISOLATED - No network access allowed

**Modules**:
- `secretSharing.js`: Shamir's Secret Sharing wrapper
  - Uses @privy-io/shamir-secret-sharing (Cure53 audited)
  - Splits secret into K-of-N shares
  - Mitigates zero-share attacks

- `encryption.js`: Symmetric encryption for payloads
  - AES-256-GCM (AEAD) only
  - Uses Node.js native crypto module
  - Each fragment encrypted independently

- `keyDerivation.js`: Password-based key derivation
  - PBKDF2-SHA256 with 600,000 iterations
  - 256-bit keys with 256-bit salts
  - Timing-safe password verification

**Design Principles**:
- Never implement custom cryptography
- Use only audited libraries for critical operations
- All inputs validated before processing
- Constant-time operations where possible

---

### 2. Bitcoin Layer (`/src/bitcoin`)
**Security Boundary**: ISOLATED - Must be mock-testable

**Modules**:
- `timelockScript.js`: Bitcoin script generation
  - Creates OP_CHECKLOCKTIMEVERIFY scripts
  - Validates timelock parameters
  - Accounts for ~2 hour MTP uncertainty

- `feeEstimation.js`: Dynamic fee calculation
  - Estimates appropriate fee rates
  - Handles fee market volatility
  - Provides fallback rates

- `constants.js`: Network configuration
  - TESTNET ONLY (until security audit)
  - Network parameters and safety margins

**Design Principles**:
- Testnet only until professional audit
- Account for Bitcoin's ~2 hour MTP lag
- Ensure adequate fees for timely confirmation
- Validate all timelock parameters

---

### 3. Nostr Layer (`/src/nostr`)
**Security Boundary**: Must handle relay failures gracefully

**Modules**:
- `multiRelayClient.js`: Multi-relay operations
  - Publishes to minimum 7 relays per fragment
  - Requires success on 5+ relays
  - Deduplicates events on fetch
  - Handles WebSocket errors

- `relayHealthCheck.js`: Relay monitoring
  - Checks relay availability
  - Measures latency
  - Filters unreliable relays

- `constants.js`: Relay configuration
  - Curated list of reliable relays
  - Geographic distribution requirements
  - Event kind definitions

**Design Principles**:
- No single relay is trusted
- Minimum 7 relay redundancy per fragment
- Geographic distribution to prevent single-point failures
- Regular health monitoring

---

### 4. Core Orchestration (`/src/core`)
**Security Boundary**: Orchestration only - NO crypto operations

**Modules**:
- `coordinator.js`: Event-driven coordinator
  - Orchestrates between layers
  - Manages state machine
  - Emits events for monitoring
  - NO cryptographic operations

- `config.js`: Configuration management
  - Loads and validates environment variables
  - Enforces security constraints
  - Provides typed configuration access

**Design Principles**:
- Single responsibility: orchestration only
- Delegate all crypto to crypto layer
- Event-driven for extensibility
- Fail-fast on configuration errors

---

## Data Flow

### Setup Flow
```
User Secret
    ↓
[Crypto: Split Secret] → N shares
    ↓
[Crypto: Encrypt Shares] → N encrypted fragments
    ↓
[Bitcoin: Create Timelock] → Timelock transaction
    ↓
[Nostr: Distribute Fragments] → 7+ relays per fragment
    ↓
[Local: Store Metadata] → Recovery information
```

### Check-In Flow
```
User Authentication
    ↓
[Bitcoin: Create New Timelock] → Extended timelock
    ↓
[Nostr: Update Metadata] → New check-in timestamp
    ↓
[Local: Record Check-In] → Local state update
```

### Recovery Flow
```
[Bitcoin: Verify Timelock Expired]
    ↓
[Nostr: Fetch Fragments] → From 7+ relays
    ↓
[Crypto: Decrypt Fragments] → Encrypted shares → Decrypted shares
    ↓
[Crypto: Reconstruct Secret] → K shares → Original secret
```

---

## Security Architecture

### Defense in Depth
1. **Cryptographic Isolation**: Crypto module has no network access
2. **Redundancy**: 7+ relays required for fragment storage
3. **Threshold Security**: K-of-N secret sharing
4. **Time Barriers**: Bitcoin timelock prevents premature access
5. **Encryption**: Each fragment encrypted with strong keys

### Trust Model
**Trusted**:
- Node.js crypto module
- @privy-io/shamir-secret-sharing library
- bitcoinjs-lib library
- Bitcoin blockchain consensus

**Not Trusted**:
- Individual Nostr relays (hence redundancy)
- Network infrastructure
- User device security (user responsibility)

### Failure Modes
1. **Relay Failures**: Mitigated by 7+ relay redundancy
2. **Bitcoin Fee Spikes**: Mitigated by dynamic fee estimation
3. **Timelock Uncertainty**: Mitigated by safety margins
4. **Implementation Bugs**: Mitigated by 100% test coverage

---

## Technology Stack

### Core Dependencies
- **Node.js** ≥18.0.0 (native crypto module)
- **@privy-io/shamir-secret-sharing** (Cure53 audited)
- **bitcoinjs-lib** (industry standard)
- **ws** (WebSocket for Nostr)

### Testing
- **jest** (unit and integration tests)
- 100% coverage requirement for crypto module
- Mock Bitcoin and Nostr for deterministic tests

---

## Deployment Considerations

### Current Status
- Development phase
- Testnet only
- Not production ready

### Production Requirements
- [ ] Professional security audit
- [ ] Bitcoin mainnet configuration
- [ ] Production relay infrastructure
- [ ] Monitoring and alerting
- [ ] Backup and recovery procedures
- [ ] User authentication system
- [ ] Rate limiting and DoS protection

---

## Future Enhancements

### Planned (v2.0)
- Key rotation mechanism
- Multiple authentication methods
- Backup check-in mechanisms
- Lightning Network support
- Tor network support for privacy

### Under Consideration
- Post-quantum cryptography
- Hardware security module (HSM) integration
- Multi-user scenarios (shared secrets)
- Plausible deniability features
- Mobile application

---

## References

### Cryptography
- [Cure53 Audit of @privy-io/shamir-secret-sharing](https://cure53.de/)
- [NIST Guidelines on Key Derivation Functions](https://csrc.nist.gov/publications/detail/sp/800-132/final)

### Bitcoin
- [Bitcoin Timelocks Documentation](https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki)
- [Bitcoin Script Reference](https://en.bitcoin.it/wiki/Script)

### Nostr
- [Nostr Protocol Specification](https://github.com/nostr-protocol/nips)
- [Nostr Relay Implementation](https://github.com/nostr-protocol/nostr)