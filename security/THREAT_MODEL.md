# ECHOLOCK Threat Model

## Document Information
- **Version**: 2.0.0
- **Last Updated**: 2025-12-29
- **Status**: Development - Pre-Audit
- **Scope**: ECHOLOCK v0.1.0 cryptographic dead man's switch system
- **Architecture Status**: Centralized prototype (see CLAUDE.md for target)

## Executive Summary

ECHOLOCK is a cryptographic dead man's switch that combines Bitcoin timelocks with Nostr-based distributed storage and Shamir Secret Sharing. The system is designed to automatically release encrypted secrets after a specified timelock expires, unless the user performs regular check-ins.

**CRITICAL NOTICE**: The current implementation (v0.x) is **centralized**. The server controls all keys, checks all timers, and performs all message releases. This represents the single largest threat to the system and is being addressed in v1.0.

**Critical Risk Areas (Current Architecture):**
1. **Central server dependency (CRITICAL - architectural flaw)**
2. Cryptographic implementation errors (premature disclosure or permanent loss)
3. Timelock misconfiguration (incorrect release timing)
4. Insufficient relay redundancy (data availability failure)
5. Key management vulnerabilities (unauthorized access)

---

## CRITICAL THREAT: Central Server Dependency

### Description
The current architecture has a **single point of failure**: the EchoLock server.

### Attack Surface
| Attack Vector | Impact | Likelihood |
|---------------|--------|------------|
| Server shutdown (bankruptcy, legal) | All messages permanently lost | Medium |
| Server compromise (hack) | All messages disclosed | Medium |
| Server coercion (subpoena) | Targeted messages disclosed | Medium-High |
| Server operator malice | Any message readable/modifiable | Low |

### Current State Analysis

**What the server controls:**
- All encryption keys (derived from SERVICE_MASTER_KEY)
- All Nostr private keys (stored encrypted in database)
- All timer state (database + cron job)
- Message decryption and delivery

**What happens if server fails:**
- Timer stops being checked
- Messages never release
- Fragments on Nostr are unrecoverable (keys are lost)
- **All user data is permanently inaccessible**

### Mitigation Status

| Mitigation | Status |
|------------|--------|
| Eliminate server key control | ⚠️ Phase 1 of migration |
| Distributed timer (Guardian Network) | ⚠️ Phase 3 of migration |
| User-controlled Nostr keys | ⚠️ Phase 2 of migration |
| Autonomous release mechanism | ⚠️ Phase 5 of migration |

**Timeline**: See [ROADMAP.md](../ROADMAP.md) for migration phases.

### Target Architecture

See [CLAUDE.md](../CLAUDE.md) for the Guardian Network architecture that eliminates this threat.

---

---

## Assets

### 1. **User Secret** (Critical)
- The sensitive data being protected (e.g., passwords, keys, personal information)
- **Confidentiality Impact**: HIGH - Unauthorized disclosure could endanger user
- **Integrity Impact**: MEDIUM - Corruption leads to loss of data
- **Availability Impact**: HIGH - Loss means permanent data unavailability

### 2. **Secret Shares** (Critical)
- Shamir Secret Sharing fragments (5 fragments, 3-of-5 threshold)
- Distributed across 7+ Nostr relays
- **Threat**: If ≥3 shares are compromised, secret can be reconstructed prematurely
- **Threat**: If <3 shares remain available, secret is permanently lost

### 3. **Private Keys** (Critical)
- **Bitcoin Private Key**: Controls timelock transactions and funds
- **Nostr Private Key**: Signs fragment events for authentication
- **Encryption Key**: AES-256-GCM key derived from master secret
- **Threat**: Private key compromise enables unauthorized operations

### 4. **Timelock State** (High)
- Current check-in timestamp and expiry time
- Bitcoin transaction locktime configuration
- **Threat**: State manipulation could trigger premature or delayed release

### 5. **System Configuration** (Medium)
- Relay list, threshold parameters, fee settings
- **Threat**: Misconfiguration could render system inoperable

### 6. **Local Storage Data** (Medium)
- Switch metadata, encrypted parameters (not secrets)
- **Threat**: Information disclosure about system usage

---

## Threat Categories

### 1. Cryptographic Threats

#### 1.1 Weak Secret Sharing Implementation
- **Risk**: HIGH
- **Description**: Custom or flawed Shamir Secret Sharing implementations may have cryptographic weaknesses
- **Attack Vector**:
  - Mathematical errors in polynomial generation
  - Insufficient entropy in coefficient selection
  - Zero-share attacks
- **Impact**: Secret reconstruction with fewer than threshold shares
- **Mitigation**:
  - Use audited `shamir-secret-sharing@0.0.4` library by Privy
  - Library audited by Cure53 and Zellic
  - Zero dependencies, constant-time operations
  - Never implement custom Shamir SSS
- **Status**: ✅ Mitigated

#### 1.2 Insufficient Entropy
- **Risk**: CRITICAL
- **Description**: Weak random number generation can make cryptographic operations predictable
- **Attack Vector**:
  - Predictable IV generation in AES-GCM
  - Weak salt generation in PBKDF2
  - Predictable key generation
- **Impact**: Complete cryptographic failure, secret disclosure
- **Mitigation**:
  - Use Node.js `crypto.randomBytes()` (CSPRNG)
  - Never use `Math.random()` or predictable sources
  - Verify 12-byte IV for GCM mode
  - Verify 32-byte salt for PBKDF2
- **Status**: ✅ Mitigated

#### 1.3 Side-Channel Attacks
- **Risk**: MEDIUM
- **Description**: Timing attacks on cryptographic operations can leak secret information
- **Attack Vector**:
  - Timing differences in share reconstruction
  - Timing differences in password verification
  - Cache-timing attacks on AES operations
- **Impact**: Partial or complete secret disclosure
- **Mitigation**:
  - Use `crypto.timingSafeEqual()` for password verification
  - Shamir library uses constant-time operations
  - Native Node.js crypto is hardware-accelerated (AES-NI)
- **Status**: ✅ Partially mitigated (hardware-dependent)

#### 1.4 Authentication Tag Bypass (AES-GCM)
- **Risk**: HIGH
- **Description**: GCM authentication must be enforced to prevent ciphertext tampering
- **Attack Vector**:
  - Ciphertext modification without auth tag verification
  - Replay attacks with old ciphertext/tag pairs
- **Impact**: Integrity loss, potential chosen-ciphertext attacks
- **Mitigation**:
  - Always verify auth tag before decryption (enforced by crypto.createDecipheriv)
  - Use unique IV for every encryption operation
  - Consider including version/context in AAD
- **Status**: ✅ Mitigated

#### 1.5 Key Derivation Weaknesses
- **Risk**: MEDIUM
- **Description**: Weak password-based key derivation enables brute-force attacks
- **Attack Vector**:
  - Low iteration count in PBKDF2
  - Weak password policy
  - Salt reuse
- **Impact**: Password compromise through brute-force
- **Mitigation**:
  - PBKDF2-SHA256 with 600,000 iterations (OWASP 2023 recommendation)
  - 32-byte random salt per password
  - User education on strong passwords
- **Status**: ✅ Mitigated (user password strength remains user responsibility)

---

### 2. Bitcoin Network Threats

#### 2.1 Timelock Uncertainty (Median Time Past)
- **Risk**: HIGH
- **Description**: Bitcoin uses MTP for CLTV, causing ~2 hour uncertainty window
- **Attack Vector**:
  - MTP lags behind actual time by up to 2 hours
  - User check-in might appear late due to MTP
- **Impact**: Premature secret release or unexpected timelock delays
- **Mitigation**:
  - Build 4-hour safety margin into check-in deadlines
  - User education on MTP mechanics
  - Display "earliest/expected/latest" unlock times
  - Conservative timelock parameter validation
- **Status**: ⚠️ Partially mitigated (inherent Bitcoin limitation)

#### 2.2 Transaction Censorship
- **Risk**: MEDIUM
- **Description**: Bitcoin miners/relays may censor certain transactions
- **Attack Vector**:
  - Transaction blacklisting by miners
  - Node policy rejection (e.g., non-standard scripts)
  - Deliberate DoS against user transactions
- **Impact**: Check-in transactions fail, leading to unwanted secret release
- **Mitigation**:
  - Use standard transaction formats
  - Adequate fee rates for priority confirmation
  - Multiple transaction broadcasting strategies
  - Fallback to local timelock if Bitcoin unavailable
- **Status**: ⚠️ Partially mitigated

#### 2.3 Fee Market Volatility
- **Risk**: MEDIUM
- **Description**: Sudden fee spikes can prevent transaction confirmation
- **Attack Vector**:
  - Fee estimation underestimates required fee
  - Network congestion during check-in window
  - User has insufficient funds for fees
- **Impact**: Check-in fails, triggering unwanted secret release
- **Mitigation**:
  - Dynamic fee estimation from multiple sources
  - Conservative fee rate selection (high priority)
  - RBF (Replace-By-Fee) support for fee bumping
  - Warn user of low balance
- **Status**: ✅ Mitigated (with monitoring)

#### 2.4 Blockchain Reorganization
- **Risk**: LOW
- **Description**: Chain reorgs can invalidate confirmed transactions
- **Attack Vector**:
  - 1-6 block reorg removes check-in transaction
  - Timelock transaction gets reorganized out
- **Impact**: System state becomes inconsistent with blockchain
- **Mitigation**:
  - Wait for 6+ confirmations before trusting check-in
  - Monitor for reorgs and adjust state
  - Use testnet only until production-ready
- **Status**: ⚠️ Future enhancement needed

#### 2.5 51% Attacks
- **Risk**: LOW (out of scope for current threat model)
- **Description**: Attacker with majority hashrate can manipulate blockchain
- **Impact**: Arbitrary timelock manipulation
- **Mitigation**: Out of scope - systemic Bitcoin risk
- **Status**: ⚠️ Accepted risk

---

### 3. Nostr Network Threats

#### 3.1 Relay Failures
- **Risk**: HIGH
- **Description**: Nostr relays can go offline permanently without warning
- **Attack Vector**:
  - Relay operator shutdown
  - Server hardware failure
  - DDoS attack on relay
  - Economic/legal pressure on relay operators
- **Impact**: Loss of secret shares, inability to reconstruct secret
- **Mitigation**:
  - Minimum 7 relay redundancy per fragment
  - Geographic distribution of relays
  - Exponential backoff for unhealthy relays
  - Health check monitoring
  - Require minimum 5 successful publishes
- **Status**: ✅ Mitigated (with 7+ relay redundancy)

#### 3.2 Data Persistence
- **Risk**: HIGH
- **Description**: Nostr relays have no guaranteed data retention
- **Attack Vector**:
  - Relay deletes old events
  - Relay storage full, prunes events
  - Relay policy changes exclude fragment events
- **Impact**: Permanent loss of secret shares
- **Mitigation**:
  - Use NIP-78 application-specific event format
  - Multiple relay redundancy (7+ per fragment)
  - Periodic verification of fragment availability
  - Future: Paid relay with SLA guarantees
- **Status**: ⚠️ Requires ongoing monitoring

#### 3.3 Sybil Attacks
- **Risk**: MEDIUM
- **Description**: Single adversary controls multiple relay identities
- **Attack Vector**:
  - Attacker runs 3+ relays in relay list
  - Attacker collects threshold shares
  - Premature secret reconstruction
- **Impact**: Unauthorized secret disclosure
- **Mitigation**:
  - Geographic relay diversity
  - Reputation-based relay selection
  - Avoid relays with shared operators/infrastructure
  - NIP-65 relay discovery (future enhancement)
- **Status**: ⚠️ Partially mitigated (relay selection heuristics)

#### 3.4 Traffic Analysis
- **Risk**: MEDIUM
- **Description**: Network monitoring can reveal fragment storage patterns
- **Attack Vector**:
  - ISP/government monitors Nostr traffic
  - Correlation of event publishing patterns
  - Identification of user's Nostr pubkey
- **Impact**: Metadata disclosure, user identification
- **Mitigation**:
  - Tor/VPN support (future enhancement)
  - Ephemeral Nostr keypairs per switch
  - Encrypted event content (fragments are opaque)
- **Status**: ⚠️ Future enhancement needed

#### 3.5 Replay Attacks
- **Risk**: LOW
- **Description**: Attacker republishes old fragment events
- **Attack Vector**:
  - Capture old fragment events
  - Replay during secret reconstruction
  - Cause reconstruction with stale shares
- **Impact**: Incorrect secret reconstruction
- **Mitigation**:
  - NIP-01 event ID verification
  - Event signature verification (Nostr built-in)
  - Deduplication by event ID
  - Version/timestamp in fragment metadata
- **Status**: ✅ Mitigated

---

### 4. Operational Threats

#### 4.1 User Error
- **Risk**: HIGH
- **Description**: Users may misconfigure system or lose credentials
- **Attack Vector**:
  - Incorrect check-in interval (too short/too long)
  - Lost Bitcoin private key (can't check in)
  - Forgotten encryption password
  - Accidental switch deletion
- **Impact**: Premature release or permanent data loss
- **Mitigation**:
  - Configuration validation with clear error messages
  - Sane defaults (72 hour check-in)
  - Warning prompts for destructive actions
  - Comprehensive documentation and examples
  - Key backup recommendations
- **Status**: ✅ Partially mitigated (user education)

#### 4.2 Software Bugs
- **Risk**: CRITICAL
- **Description**: Implementation vulnerabilities in ECHOLOCK code
- **Attack Vector**:
  - Off-by-one errors in timelock calculation
  - Race conditions in check-in logic
  - Buffer overflows or memory corruption
  - Logic errors in share reconstruction
- **Impact**: Premature disclosure, permanent loss, or system compromise
- **Mitigation**:
  - 100% test coverage for crypto module
  - Property-based testing for crypto operations
  - Comprehensive unit and integration tests
  - Professional security audit before production
  - Static analysis and linting
- **Status**: ⚠️ Requires security audit

#### 4.3 Dependency Vulnerabilities
- **Risk**: MEDIUM
- **Description**: Compromised or vulnerable npm packages
- **Attack Vector**:
  - Supply chain attack on dependencies
  - Unpatched vulnerabilities in libraries
  - Malicious package updates
- **Impact**: Complete system compromise
- **Mitigation**:
  - Minimal dependency footprint (6 production dependencies)
  - Use audited libraries (shamir-secret-sharing, bitcoinjs-lib)
  - Regular `npm audit` checks
  - Pin exact versions in package.json
  - Verify package signatures/checksums
- **Status**: ✅ Mitigated (0 vulnerabilities as of 2025-10-02)

#### 4.4 Insecure Local Storage
- **Risk**: MEDIUM
- **Description**: Local filesystem storage may be insecure
- **Attack Vector**:
  - Attacker reads `data/` directory
  - Forensic extraction from disk
  - Malware reads process memory
- **Impact**: Disclosure of metadata (not secrets, which are never stored locally)
- **Mitigation**:
  - Never store secrets or private keys on disk
  - Encrypt sensitive metadata (future enhancement)
  - Clear warnings about local storage security
  - Recommend full-disk encryption
- **Status**: ⚠️ Partial (metadata only, no secrets)

#### 4.5 Logging and Debugging
- **Risk**: LOW
- **Description**: Debug logs may leak sensitive information
- **Attack Vector**:
  - Secrets logged to console/files
  - Private keys in error messages
  - Fragments visible in debug output
- **Impact**: Information disclosure
- **Mitigation**:
  - Never log secrets, keys, or fragments
  - Redact sensitive data in error messages
  - Disable debug logging in production
  - Code review for logging practices
- **Status**: ✅ Mitigated (requires ongoing vigilance)

---

### 5. Adversary Scenarios

#### 5.1 Coercion / Rubber Hose Attack
- **Risk**: MEDIUM (out of scope for technical controls)
- **Description**: User physically forced to reveal secret or disable switch
- **Attack Vector**:
  - Physical violence or threats
  - Legal compulsion (court order)
  - Extortion by adversary
- **Impact**: Complete secret disclosure
- **Mitigation**:
  - Plausible deniability features (future consideration)
  - Duress codes that trigger different behavior
  - No technical solution to physical coercion
- **Status**: ⚠️ Out of scope

#### 5.2 Forensic Analysis
- **Risk**: MEDIUM
- **Description**: Device seizure and forensic examination
- **Attack Vector**:
  - Law enforcement seizure
  - Theft of user device
  - Post-mortem device analysis
- **Impact**: Metadata disclosure (not secrets)
- **Mitigation**:
  - No local storage of secrets
  - Encrypted metadata (future enhancement)
  - Secure key deletion
  - Memory wiping on exit (future consideration)
- **Status**: ⚠️ Partial protection

#### 5.3 Network Monitoring / SIGINT
- **Risk**: MEDIUM
- **Description**: Adversary monitors all network traffic
- **Attack Vector**:
  - ISP/government surveillance
  - Traffic analysis of Bitcoin transactions
  - Nostr relay connection monitoring
  - Correlation of timing patterns
- **Impact**: Metadata disclosure, user identification
- **Mitigation**:
  - Tor/VPN support (future enhancement)
  - Nostr traffic is WebSocket (not easily fingerprintable)
  - Bitcoin transactions are pseudonymous
  - Mix timing of check-ins (future enhancement)
- **Status**: ⚠️ Future enhancement needed

#### 5.4 Social Engineering
- **Risk**: MEDIUM (user responsibility)
- **Description**: Attacker manipulates user into revealing information
- **Attack Vector**:
  - Phishing for check-in credentials
  - Impersonation of support/authority
  - Fake "emergency" check-in requests
- **Impact**: Premature switch disabling or secret disclosure
- **Mitigation**:
  - User education and documentation
  - No remote support or backdoors
  - Warning messages for critical actions
  - Technical controls cannot prevent social engineering
- **Status**: ⚠️ User responsibility

#### 5.5 Insider Threat (Relay Operators)
- **Risk**: MEDIUM
- **Description**: Nostr relay operators collude to collect shares
- **Attack Vector**:
  - 3+ relay operators collude
  - Reconstruct secret from collected shares
- **Impact**: Unauthorized secret disclosure
- **Mitigation**:
  - Geographic and operational diversity of relays
  - Use relays with different operators
  - Reputation-based relay selection
  - Avoid relays with known affiliations
- **Status**: ⚠️ Partially mitigated (relay selection)

---

## Attack Scenarios

### Scenario 1: Premature Secret Disclosure
**Goal**: Adversary reconstructs secret before timelock expires

**Attack Path**:
1. Identify user's Nostr pubkey through traffic analysis
2. Monitor all Nostr relays for fragment events
3. Collect ≥3 shares from compromised/monitored relays
4. Reconstruct secret using Shamir SSS

**Impact**: Critical - Secret disclosed before intended time
**Likelihood**: Low (requires monitoring 3+ of 7 relays)
**Mitigations**:
- Geographic relay diversity
- Encrypted fragment content (shares are opaque binary)
- Ephemeral Nostr keys per switch

---

### Scenario 2: Permanent Data Loss
**Goal**: User loses access to secret permanently

**Attack Path**:
1. 5+ Nostr relays go offline permanently
2. Only 1-2 shares remain available
3. Cannot reach 3-of-5 threshold
4. Secret is permanently unrecoverable

**Impact**: Critical - Data loss
**Likelihood**: Low-Medium (depends on relay reliability)
**Mitigations**:
- 7+ relay redundancy (allows 4 relay failures)
- Health monitoring and relay rotation
- Backup to additional relays proactively

---

### Scenario 3: Timelock Bypass via Bitcoin Attack
**Goal**: Bypass timelock to release secret early

**Attack Path**:
1. Attempt to manipulate Bitcoin block timestamps
2. Requires 51% mining majority (out of scope)
3. Or exploit MTP calculation vulnerabilities

**Impact**: Critical - Premature release
**Likelihood**: Very Low (requires massive resources)
**Mitigations**:
- Inherent Bitcoin security model
- Conservative safety margins
- Out of scope for application-level security

---

### Scenario 4: Supply Chain Attack
**Goal**: Compromise ECHOLOCK via malicious dependency

**Attack Path**:
1. Compromise npm package (e.g., shamir-secret-sharing)
2. Publish malicious version
3. Users update and install compromised version
4. Backdoor exfiltrates secrets during encryption

**Impact**: Critical - Complete compromise
**Likelihood**: Low (audited libraries, small attack surface)
**Mitigations**:
- Use audited, reputable libraries
- Pin exact versions in package.json
- Regular dependency audits
- Minimal dependency footprint

---

## Out of Scope (Current Version)

The following threats are acknowledged but out of scope for current implementation:

1. **Nation-State Adversaries with Bitcoin Mining Majority**
   - Systemic Bitcoin risk, not application-specific

2. **Quantum Computing Attacks**
   - Post-quantum cryptography future consideration
   - AES-256 has 128-bit quantum security
   - Shamir SSS vulnerable to Shor's algorithm (future upgrade)

3. **Physical Security of User Devices**
   - User responsibility (full-disk encryption, secure boot, etc.)

4. **Social Engineering Attacks**
   - Cannot be solved technically
   - User education and awareness is primary defense

5. **Advanced Persistent Threats (APT) with Device Compromise**
   - If attacker has full device access, cryptography cannot help
   - Secure enclave/TEE future consideration

6. **Legal Compulsion and Key Disclosure Laws**
   - Jurisdiction-specific legal risks
   - Out of scope for technical threat model

---

## Risk Assessment Summary

| Risk Category | Risk Level | Status | Priority |
|---------------|------------|--------|----------|
| Cryptographic implementation errors | **CRITICAL** | ⚠️ Requires audit | P0 |
| Insufficient entropy | **CRITICAL** | ✅ Mitigated | - |
| Timelock misconfiguration | **HIGH** | ⚠️ Partial | P1 |
| Insufficient relay redundancy | **HIGH** | ✅ Mitigated | - |
| Software bugs | **HIGH** | ⚠️ Requires audit | P0 |
| Relay failures | **HIGH** | ✅ Mitigated | - |
| Fee estimation failures | **MEDIUM** | ✅ Mitigated | P2 |
| User operational errors | **MEDIUM** | ⚠️ User education | P2 |
| Network monitoring | **MEDIUM** | ⚠️ Future enhancement | P3 |
| Sybil attacks | **MEDIUM** | ⚠️ Partial | P2 |
| Individual relay failures | **LOW** | ✅ Mitigated | - |

**Legend:**
- ✅ Mitigated: Adequate controls in place
- ⚠️ Partial: Some controls, gaps remain
- ❌ Not Mitigated: No controls in place

---

## Security Requirements

### Pre-Production Checklist
- [ ] Professional security audit by qualified firm
- [ ] Property-based testing for all crypto operations
- [ ] Formal verification of timelock logic
- [ ] Penetration testing on testnet
- [ ] Third-party code review
- [ ] Incident response plan
- [ ] Responsible disclosure program (security.txt)
- [ ] Bug bounty program consideration

### Production Hardening
- [ ] Tor/VPN support for network privacy
- [ ] Encrypted local metadata
- [ ] Memory wiping for sensitive data
- [ ] Rate limiting on check-ins
- [ ] Multi-factor authentication (future)
- [ ] Hardware wallet integration (future)
- [ ] Secure enclave support (future)

---

## Conclusion

ECHOLOCK's security depends on multiple layers:
1. **Cryptographic**: Audited libraries, strong primitives (AES-256-GCM, Shamir SSS)
2. **Network**: Distributed trust across Bitcoin and Nostr networks
3. **Operational**: Comprehensive testing, clear documentation, security audit

**Current Status**: Development/testnet only. **NOT production-ready** until security audit completed.

**Critical Blockers for Production**:
1. Professional security audit
2. Property-based testing for crypto
3. Formal verification of timelock logic
4. Comprehensive incident response plan