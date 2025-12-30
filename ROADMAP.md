# ECHOLOCK Roadmap

> **The Goal**: A system where the user controls their keys, the timer is on-chain or distributed, and the message releases automatically without any company being involved. The company should be eliminable - if EchoLock disappeared, the system should work exactly the same.

See [CLAUDE.md](CLAUDE.md) for the complete architectural vision.

**Last Updated**: 2025-12-30
**Current Version**: 1.0.0 (Fully Decentralized)
**Status**: ✅ Core architecture complete. Awaiting security audit for mainnet.

---

## 🎉 MILESTONE ACHIEVED: Full Decentralization

**December 30, 2025** - All 5 decentralization phases completed in a single day.

### The Transformation

| Component | Before (v0.x) | After (v1.0) |
|-----------|---------------|--------------|
| **Keys** | Server-controlled | User-controlled (browser-generated) |
| **Timer** | Server cron job | Guardian Network watching Nostr |
| **Storage** | Server database | Nostr relays (7+ globally distributed) |
| **Release** | Server reconstructs & sends | Autonomous: Guardians → Nostr → Recipients |
| **Survival** | Dies with server | **Works without EchoLock** |

### The Ultimate Test: ✅ PASSED

1. ✅ User creates a switch (keys generated locally)
2. ✅ User stops all check-ins
3. ✅ EchoLock goes offline (simulated)
4. ✅ Message still releases to recipients (via Guardian Network)

---

## Completed Phases

### ✅ Phase 1: User-Controlled Keys (Dec 30, 2025)

- [x] Client-side key generation (browser WebCrypto API)
- [x] Keys stored in browser IndexedDB
- [x] Server receives only encrypted blobs + public keys
- [x] Encrypted key export/backup functionality
- [x] Key verification tools

**Implementation**: `frontend/lib/crypto/`, `frontend/lib/keystore.ts`

---

### ✅ Phase 2: Nostr-Native Heartbeats (Dec 30, 2025)

- [x] Heartbeat events (kind: 30078)
- [x] User signs heartbeats with own nsec (BIP-340 Schnorr)
- [x] Heartbeats published to 7+ Nostr relays
- [x] Anyone can verify heartbeat status independently
- [x] Standalone heartbeat verification tool

**Implementation**: `src/nostr/heartbeat.js`, `frontend/lib/crypto/nostr.ts`

---

### ✅ Phase 3: Guardian Network (Dec 30, 2025)

- [x] Guardian enrollment protocol (NIP-44 encrypted shares)
- [x] Guardian monitoring daemon (open source)
- [x] Self-hosted guardian package with config
- [x] Guardian selection UI
- [x] EchoLock as optional (not privileged) guardian
- [x] Guardian acknowledgment protocol

**Implementation**: `src/guardian-daemon/`, `frontend/components/GuardianManager.tsx`

**Guardian Types Supported**:
| Type | Example | Trust Level | Reliability |
|------|---------|-------------|-------------|
| Personal | Friend, family | High trust | Variable |
| Professional | Lawyer, executor | Legal duty | High |
| Institutional | EchoLock service | None needed | High availability |
| Self-Hosted | User's VPS | Full control | User-managed |

---

### ✅ Phase 4: Bitcoin Commitments (Dec 30, 2025)

- [x] Mainnet-ready OP_CHECKLOCKTIMEVERIFY scripts
- [x] On-chain proof of timer creation
- [x] Verifiable on any block explorer (mempool.space)
- [x] Guardian Bitcoin trigger verification
- [x] Optional layer (system works without it)

**Implementation**: `src/bitcoin/timelockCommitment.js`, `frontend/components/BitcoinCommitment.tsx`

---

### ✅ Phase 5: Full Autonomy (Dec 30, 2025)

- [x] Recipient-side reconstruction tools (web + offline)
- [x] Standalone recovery tool (`recovery-tool/index.html`)
- [x] Complete self-hosting documentation
- [x] No server needed for any operation
- [x] All components open source (AGPL-3.0)

**Implementation**: `frontend/lib/recovery/`, `recovery-tool/`, `docs/SELF_HOSTING.md`

---

## Current Status

### What's Working Now

| Feature | Status | Notes |
|---------|--------|-------|
| User-controlled keys | ✅ Complete | Browser-generated, never sent to server |
| Guardian Network | ✅ Complete | Distributed monitoring, 3-of-5 threshold |
| Nostr heartbeats | ✅ Complete | BIP-340 signed, 7+ relays |
| Bitcoin timelocks | ✅ Complete | Mainnet-ready, awaiting audit |
| Autonomous release | ✅ Complete | Works without EchoLock |
| Self-hosting | ✅ Complete | Full documentation available |
| 501 unit tests | ✅ Passing | Comprehensive coverage |

### What's Blocking Mainnet

| Blocker | Status | Action Required |
|---------|--------|-----------------|
| **Security Audit** | 🔴 Not started | Seeking professional auditors |
| Penetration Testing | 🔴 Not started | Post-audit |
| Bug Bounty Program | 🔴 Not started | Post-audit |

---

## Next Phases

### 🚧 Phase 6: Security Audit & Hardening

**Priority**: P0 - CRITICAL BLOCKER FOR MAINNET

- [x] Comprehensive threat model documented (`security/THREAT_MODEL.md`)
- [x] Security policy established (`SECURITY.md`)
- [x] Vulnerability tracking system
- [ ] **Professional security audit** ← SEEKING AUDITORS
- [ ] Formal verification of timelock logic
- [ ] Penetration testing
- [ ] External code review
- [ ] Bug bounty program

**Status**: Actively seeking professional security auditors
**Contact**: echoooolock@gmail.com

---

### Phase 7: Production Polish (Post-Audit)

- [ ] Mainnet enablement (after audit approval)
- [ ] Production monitoring & alerting
- [ ] Incident response procedures
- [ ] Performance optimization
- [ ] Load testing

**Timeline**: 2-3 months after audit completion

---

### Phase 8: Mobile & Extensions

- [ ] Mobile app (React Native) - check-ins on the go
- [ ] Browser extension - one-click heartbeat
- [ ] SMS reminder support (optional)
- [ ] Push notifications (native)

**Timeline**: Q2 2026

---

### Phase 9: Enterprise Features

- [ ] Organization/team support
- [ ] Role-based access control (RBAC)
- [ ] SSO integration (SAML, OIDC)
- [ ] Audit logging & compliance
- [ ] White-label deployment
- [ ] API for third-party integration

**Timeline**: Q3-Q4 2026

---

### Phase 10: Advanced Cryptography (Research)

- [ ] Post-quantum cryptography evaluation
- [ ] Threshold signature schemes
- [ ] Hardware wallet integration
- [ ] Lightning Network integration
- [ ] Taproot support

**Timeline**: 2026+

---

## Technical Debt

### High Priority
- [ ] Mock Nostr relays for CI (integration tests fail offline)
- [ ] 4 TODOs remaining in `src/core/coordinator.js`

### Medium Priority
- [ ] Performance profiling
- [ ] Logging standardization
- [ ] Error message improvements

### Low Priority
- [ ] Code style consistency
- [ ] Additional language translations

---

## Version History

| Version | Date | Milestone |
|---------|------|-----------|
| v0.1.0 | Oct 2025 | Centralized prototype |
| v0.5.0 | Oct 2025 | Dashboard enhancements |
| **v1.0.0** | **Dec 30, 2025** | **Full decentralization achieved** |
| v1.1.0 | TBD | Post-audit mainnet release |
| v2.0.0 | 2026 | Enterprise edition |

---

## Call for Contributions

### 🔴 Critical Need: Security Auditors

We need professional security auditors to review:
- Cryptographic implementation (AES-256-GCM, Shamir, PBKDF2)
- Bitcoin timelock scripts (OP_CHECKLOCKTIMEVERIFY)
- Nostr protocol integration
- Guardian Network protocol
- Client-side key management

**Contact**: echoooolock@gmail.com

### Also Seeking

- Bitcoin protocol experts
- Nostr protocol developers
- Mobile developers (React Native)
- Technical writers
- Translators

---

## Links

- **Repository**: https://github.com/1e9c9h9o/echolock
- **Architecture**: [CLAUDE.md](CLAUDE.md)
- **Security Policy**: [SECURITY.md](SECURITY.md)
- **Self-Hosting Guide**: [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md)
- **Issue Tracker**: https://github.com/1e9c9h9o/echolock/issues

---

## License

ECHOLOCK is licensed under AGPL-3.0. See [LICENSE](LICENSE) for details.

---

**The North Star is achieved.** If EchoLock disappears tomorrow, your switch still works.
