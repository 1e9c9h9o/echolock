# ECHOLOCK Security Policy

## Current Status

⚠️ **WARNING: EXPERIMENTAL SOFTWARE - NOT PRODUCTION READY**

ECHOLOCK v0.1.0 is in **development/testnet phase** and has **NOT** undergone a professional security audit. Do not use this software to protect actual sensitive data.

**Last Updated**: 2025-10-02
**Version**: 0.1.0
**Security Audit Status**: Pre-audit

---

## Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability in ECHOLOCK, please report it responsibly:

### How to Report

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. **DO** report via one of these channels:
   - GitHub Security Advisory: [Create Advisory](https://github.com/[username]/echolock/security/advisories/new)
   - Email: security@example.com
3. Include detailed information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fixes (if any)

### What to Expect

- **Acknowledgment**: Within 72 hours of report
- **Initial Triage**: Risk assessment within 7 days
- **Updates**: Regular status updates throughout fix process
- **Disclosure**: Coordinated disclosure after patch is ready
- **Credit**: Recognition in AUDIT_LOG.md (unless anonymity requested)

### Response Timeline by Severity

| Severity | Initial Response | Target Fix Time |
|----------|------------------|-----------------|
| **CRITICAL** | Immediate | 7 days |
| **HIGH** | Within 7 days | 30 days |
| **MEDIUM** | Within 14 days | 60 days |
| **LOW** | Within 30 days | Next release |

**Severity Criteria**:
- **CRITICAL**: Remote code execution, secret disclosure, key compromise
- **HIGH**: Cryptographic bypass, timelock manipulation, data loss
- **MEDIUM**: DoS attacks, information disclosure, logic errors
- **LOW**: Minor issues with low security impact

---

## Security Scope

### IN SCOPE (Please Report)

✅ **Cryptographic Vulnerabilities**
- Weak or incorrect cryptographic implementations
- Key generation predictability or weakness
- Secret sharing bypass (reconstruction with insufficient shares)
- AES-GCM authentication bypass
- Timing attacks or side-channel leaks

✅ **Timelock Vulnerabilities**
- Timelock bypass mechanisms
- Premature or delayed secret release
- Check-in manipulation or spoofing
- Bitcoin transaction manipulation

✅ **Data Integrity & Confidentiality**
- Premature secret disclosure
- Permanent data loss scenarios
- Nostr relay attack vectors
- Secret reconstruction vulnerabilities

✅ **Implementation Bugs**
- Memory leaks exposing sensitive data
- Logic errors in critical paths
- Race conditions in check-in/release
- Dependency vulnerabilities with security impact

### OUT OF SCOPE (Lower Priority)

❌ **Low-Impact Issues**
- Denial of Service attacks (acknowledged risk)
- UI/UX issues without security implications
- Documentation typos
- Performance optimization suggestions

❌ **External Attack Vectors**
- Social engineering attacks
- Physical device security
- Bitcoin network-wide attacks (51% attacks)
- Quantum computing attacks (out of scope for current version)
- Attacks requiring nation-state resources
- Compromise requiring full device access

---

## Known Vulnerabilities & Mitigations

### 1. Bitcoin Median Time Past (MTP) Uncertainty
- **Risk**: HIGH
- **Description**: Bitcoin's MTP can lag ~2 hours behind real time
- **Impact**: Timelock delays or premature unlocking
- **Mitigation**:
  - Build 4-hour safety margins into check-in windows
  - Display "earliest/expected/latest" unlock estimates
  - User education about MTP mechanics
- **Status**: Partially mitigated (inherent Bitcoin limitation)

### 2. Nostr Relay Persistence
- **Risk**: HIGH
- **Description**: Relays have no guaranteed long-term data retention
- **Impact**: Loss of secret shares, permanent data unavailability
- **Mitigation**:
  - Minimum 7+ relay redundancy per fragment
  - Health monitoring with exponential backoff
  - Geographic distribution of relays
  - NIP-78 application-specific event format
- **Status**: Mitigated with proper relay redundancy

### 3. Shamir Secret Sharing Zero-Share Attacks
- **Risk**: CRITICAL (if custom implementation used)
- **Description**: Flawed Shamir implementations may allow secret reconstruction with fewer shares
- **Mitigation**:
  - Use audited `shamir-secret-sharing@0.0.4` library by Privy
  - Library audited by Cure53 and Zellic
  - Never implement custom Shamir SSS
- **Status**: ✅ Mitigated

### 4. Insufficient Entropy
- **Risk**: CRITICAL
- **Description**: Weak random number generation breaks cryptography
- **Mitigation**:
  - Use Node.js `crypto.randomBytes()` (CSPRNG) exclusively
  - Never use `Math.random()` for cryptographic operations
- **Status**: ✅ Mitigated

### 5. Dependency Vulnerabilities
- **Risk**: MEDIUM
- **Description**: Compromised or vulnerable npm packages
- **Mitigation**:
  - Minimal dependency footprint (6 production dependencies)
  - Use audited libraries only
  - Regular `npm audit` checks
  - Pin exact versions in package.json
- **Status**: ✅ Mitigated (0 vulnerabilities as of 2025-10-02)

See [security/THREAT_MODEL.md](security/THREAT_MODEL.md) for comprehensive threat analysis.
See [security/VULNERABILITIES.md](security/VULNERABILITIES.md) for detailed vulnerability tracking.

---

## Security Architecture

### Cryptographic Libraries (Mandatory)

| Component | Library | Version | Status |
|-----------|---------|---------|--------|
| Secret Sharing | shamir-secret-sharing | 0.0.4 | ✅ Audited |
| Bitcoin Operations | bitcoinjs-lib | 6.1.7 | ✅ Industry Standard |
| Encryption | Node.js crypto (AES-256-GCM) | Native | ✅ Built-in |
| Key Derivation | Node.js crypto (PBKDF2) | Native | ✅ Built-in |
| Nostr Protocol | nostr-tools | 2.17.0 | ✅ Community Standard |

**CRITICAL**: Do not replace these libraries with custom implementations.

### Security Boundaries

1. **Crypto Module (ISOLATED)**: No network access, no external I/O
2. **Bitcoin Module**: Testnet only, no mainnet transactions
3. **Nostr Module**: Public relay network, assume adversarial relays
4. **Local Storage**: Metadata only, no secrets stored locally

---

## Testing Requirements

### Pre-Production Checklist

- [ ] Professional security audit by qualified firm
- [ ] Property-based testing for all crypto operations (✅ Implemented)
- [ ] 100% test coverage for crypto module (✅ Achieved)
- [ ] Formal verification of timelock logic
- [ ] Penetration testing on testnet
- [ ] Third-party code review
- [ ] Incident response plan
- [ ] Bug bounty program setup

### Current Test Coverage

- ✅ 41/41 unit tests passing
- ✅ 22/22 property-based tests passing (fast-check)
- ✅ Integration tests for Nostr relays
- ✅ Bitcoin testnet transaction broadcasting
- ⚠️ Formal verification pending
- ⚠️ Security audit pending

### Testing Standards

1. **Crypto Module**: 100% code coverage required
2. **Property-Based Testing**: All crypto operations must pass property tests
3. **Integration Tests**: Full lifecycle tests with live networks (testnet/Nostr)
4. **Error Handling**: All failure modes must be tested
5. **No Production Use**: Testnet and demo mode only until audit

---

## Production Readiness Blockers

ECHOLOCK is **NOT READY** for production use. Required before production:

1. ✅ Comprehensive threat model documentation
2. ✅ Property-based testing for crypto operations
3. ⚠️ **Professional security audit** (P0 blocker)
4. ⚠️ **Formal verification of timelock logic** (P0 blocker)
5. ⚠️ **Penetration testing** (P1 blocker)
6. ⚠️ **Incident response plan** (P1 blocker)
7. ⚠️ **Third-party code review** (P1 blocker)

**Estimated time to production**: 6-12 months after audit completion

---

## Security Resources

- **Threat Model**: [security/THREAT_MODEL.md](security/THREAT_MODEL.md)
- **Vulnerability Tracking**: [security/VULNERABILITIES.md](security/VULNERABILITIES.md)
- **Audit Log**: [security/AUDIT_LOG.md](security/AUDIT_LOG.md)
- **Security Contact**: [.well-known/security.txt](.well-known/security.txt)
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Responsible Disclosure

We follow coordinated vulnerability disclosure:

1. **Report received** → Acknowledge within 72 hours
2. **Triage** → Risk assessment and validation within 7 days
3. **Fix development** → Patch created and tested
4. **Security advisory** → Draft prepared for publication
5. **Coordinated disclosure** → Public release coordinated with reporter
6. **Credit** → Reporter acknowledged in AUDIT_LOG.md

**Disclosure Timeline**: Typically 90 days from report to public disclosure, negotiable based on severity and fix complexity.

---

## Contact

- **Security Email**: security@example.com
- **GitHub Security Advisory**: [Create Advisory](https://github.com/[username]/echolock/security/advisories/new)
- **PGP Key**: (To be published)

---

## Acknowledgments

We appreciate the security research community's efforts to improve ECHOLOCK's security. Valid vulnerability reports will be acknowledged in [security/AUDIT_LOG.md](security/AUDIT_LOG.md).

---

**Last Updated**: 2025-10-02
**Next Review**: 2026-01-02 (quarterly review)