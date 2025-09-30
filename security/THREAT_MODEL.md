# ECHOLOCK Threat Model

## Assets
1. **User Secret**: The sensitive data being protected
2. **Secret Shares**: Shamir secret sharing fragments
3. **Private Keys**: Bitcoin and Nostr private keys
4. **Timelock State**: Current check-in status and timelock configuration

## Threat Categories

### 1. Cryptographic Threats
- **Weak Secret Sharing**: Custom Shamir implementations may have vulnerabilities
  - *Mitigation*: Use audited @privy-io/shamir-secret-sharing library
- **Insufficient Entropy**: Weak random number generation
  - *Mitigation*: Use Node.js crypto.randomBytes (CSPRNG)
- **Side-Channel Attacks**: Timing attacks on cryptographic operations
  - *Mitigation*: Use constant-time operations where possible

### 2. Bitcoin Network Threats
- **Timelock Uncertainty**: Bitcoin MTP can cause ~2 hour delays
  - *Mitigation*: Build in safety margins, user education
- **Transaction Censorship**: Bitcoin transactions may be censored
  - *Mitigation*: Multiple transaction strategies, adequate fees
- **Fee Market Volatility**: Unexpected fee spikes prevent confirmation
  - *Mitigation*: Dynamic fee estimation with fallbacks

### 3. Nostr Network Threats
- **Relay Failures**: Relays may go offline permanently
  - *Mitigation*: Minimum 7 relay redundancy per fragment
- **Data Persistence**: No guarantees of long-term storage
  - *Mitigation*: Regular health checks, relay rotation
- **Sybil Attacks**: Single entity controlling multiple relays
  - *Mitigation*: Geographically distributed relay selection

### 4. Operational Threats
- **User Error**: Incorrect configuration or lost credentials
  - *Mitigation*: Configuration validation, clear documentation
- **Software Bugs**: Implementation vulnerabilities
  - *Mitigation*: 100% test coverage for crypto, security audit
- **Dependency Vulnerabilities**: Compromised npm packages
  - *Mitigation*: Minimal dependencies, regular audits

### 5. Adversary Scenarios
- **Coercion**: User forced to reveal secret
  - *Mitigation*: Plausible deniability features (future consideration)
- **Forensic Analysis**: Device seizure and analysis
  - *Mitigation*: No local storage of secrets, encrypted metadata
- **Network Monitoring**: Traffic analysis of Nostr communications
  - *Mitigation*: Tor support (future consideration)

## Out of Scope (Current Version)
- Nation-state adversaries with Bitcoin mining majority
- Quantum computing attacks (post-quantum crypto future consideration)
- Physical security of user devices
- Social engineering attacks

## Risk Assessment
- **Critical**: Cryptographic implementation errors
- **High**: Insufficient relay redundancy
- **High**: Timelock misconfiguration
- **Medium**: Fee estimation failures
- **Medium**: User operational errors
- **Low**: Individual relay failures (with proper redundancy)