# ECHOLOCK: The North Star

## The Goal

> **A system where the user controls their keys, the timer is on-chain or distributed, and the message releases automatically without any company being involved. The company should be eliminable - if you disappeared, the system should work exactly the same.**

This is the bar. If EchoLock the company vanishes tomorrow, every user's dead man's switch must still function exactly as intended. No central server. No trusted third party. No single point of failure.

---

## Current Reality (v0.x - Centralized)

**Honest assessment:** The current implementation is a centralized system with decentralized window dressing.

| Component | Claim | Reality |
|-----------|-------|---------|
| Timer | "Bitcoin timelock" | Server cron job checking database |
| Storage | "Nostr distributed" | Encrypted blobs with server-controlled keys |
| Release | "Automatic" | Server decrypts and sends email |
| Keys | "User-controlled" | Server holds all encryption keys |
| Survival | "Trustless" | Dies with the server |

**If the server goes down:** All messages are permanently lost.

This is unacceptable for the stated mission.

---

## Target Architecture (v1.0 - Truly Decentralized)

### Core Principles

1. **User Sovereignty**: User generates and controls ALL private keys
2. **No Server Dependency**: System functions identically without EchoLock servers
3. **On-Chain Timer**: Bitcoin blockchain IS the timer (not a database)
4. **Autonomous Release**: Message releases without any company action
5. **Verifiable by Anyone**: All operations can be verified independently

---

## Architecture: The Guardian Network

### Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER'S DEVICE                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  - Generates ALL keys locally (nsec, Bitcoin, encryption)   │   │
│  │  - Encrypts message with user-controlled key                │   │
│  │  - Splits key using Shamir (3-of-5)                         │   │
│  │  - Signs heartbeat events with own nsec                     │   │
│  │  - NEVER sends private keys to any server                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   GUARDIAN 1  │      │   GUARDIAN 2  │      │   GUARDIAN 3  │
│   (Friend)    │      │   (Lawyer)    │      │   (Service)   │
│               │      │               │      │               │
│ Holds 1 share │      │ Holds 1 share │      │ Holds 1 share │
│ Watches for   │      │ Watches for   │      │ Watches for   │
│ heartbeats    │      │ heartbeats    │      │ heartbeats    │
└───────────────┘      └───────────────┘      └───────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                    If no heartbeat for X days:
                    Guardians publish their shares
                                │
                                ▼
                    ┌───────────────────────┐
                    │     NOSTR RELAYS      │
                    │  (Public Bulletin)    │
                    │                       │
                    │  Encrypted shares     │
                    │  become available     │
                    │  Anyone can read      │
                    └───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │     RECIPIENTS        │
                    │                       │
                    │  Collect 3+ shares    │
                    │  Reconstruct key      │
                    │  Decrypt message      │
                    │  (No server needed)   │
                    └───────────────────────┘
```

---

## Component Design

### 1. User Key Generation (Client-Side Only)

```
User creates switch:
├── Generate Nostr keypair (nsec/npub) locally
├── Generate encryption key locally
├── Generate Bitcoin keypair locally (for optional on-chain proof)
├── Encrypt message with encryption key
├── Split encryption key into 5 Shamir shares
├── Encrypt each share for specific guardian's npub
└── Store encrypted message on Nostr (user signs with own nsec)

CRITICAL: Private keys NEVER leave user's device
```

**Implementation Requirements:**
- All cryptography runs in browser (WebCrypto API) or local CLI
- Keys stored in browser's IndexedDB or local keychain
- Optional: Export keys as encrypted backup file
- Server only sees: encrypted blobs, public keys, nothing else

### 2. The Guardian Network (Distributed Timer)

**What is a Guardian?**
A Guardian is anyone who holds a Shamir share and agrees to watch for heartbeats.

**Guardian Types:**
| Type | Example | Trust Level | Reliability |
|------|---------|-------------|-------------|
| Personal | Friend, family member | High trust | Variable |
| Professional | Lawyer, executor | Legal obligation | High |
| Institutional | EchoLock service | No special trust | High availability |
| Self-Hosted | User's own server | Full trust | User-controlled |

**Guardian Protocol:**
```
1. USER → GUARDIAN: Encrypted share (encrypted to guardian's npub)
2. USER → NOSTR: Heartbeat event (signed by user's nsec) every X hours
3. GUARDIAN: Watches Nostr for user's heartbeats
4. IF no heartbeat for configured threshold:
   GUARDIAN → NOSTR: Publishes their share (encrypted to recipient npubs)
5. RECIPIENTS: Collect 3+ shares, reconstruct key, decrypt message
```

**Critical Insight:** Even if EchoLock runs a guardian service, it's just ONE of 5 guardians. The system works if ANY 3 guardians respond. EchoLock's participation is optional and not privileged.

### 3. Heartbeat System (Nostr-Native)

**Heartbeat Event (NIP-XX proposal):**
```json
{
  "kind": 30078,
  "pubkey": "<user's npub>",
  "created_at": 1234567890,
  "tags": [
    ["d", "<switch_id>"],
    ["expiry", "1234567890"],
    ["threshold_hours", "72"],
    ["guardian", "<guardian1_npub>"],
    ["guardian", "<guardian2_npub>"],
    ["guardian", "<guardian3_npub>"],
    ["guardian", "<guardian4_npub>"],
    ["guardian", "<guardian5_npub>"]
  ],
  "content": "",
  "sig": "<user's signature>"
}
```

**How it works:**
- User publishes heartbeat to Nostr every check-in
- Anyone can verify: "Is this user still alive?"
- No server needed to check - it's public on Nostr
- Guardians independently watch for heartbeats

### 4. Share Distribution (NIP-04/NIP-44 Encrypted)

**Share Storage Event:**
```json
{
  "kind": 30079,
  "pubkey": "<user's npub>",
  "created_at": 1234567890,
  "tags": [
    ["d", "<switch_id>:<guardian_index>"],
    ["p", "<guardian_npub>"],
    ["encrypted_for", "<guardian_npub>"]
  ],
  "content": "<NIP-44 encrypted share>",
  "sig": "<user's signature>"
}
```

**Key point:** The share is encrypted TO the guardian's public key. Only that guardian can decrypt it. The guardian then re-encrypts it for recipients when releasing.

### 5. Release Trigger (Guardian Consensus)

**Release Event (published by guardian):**
```json
{
  "kind": 30080,
  "pubkey": "<guardian's npub>",
  "created_at": 1234567890,
  "tags": [
    ["d", "<switch_id>:<guardian_index>"],
    ["e", "<original_switch_event_id>"],
    ["p", "<recipient1_npub>"],
    ["p", "<recipient2_npub>"]
  ],
  "content": "<NIP-44 encrypted share for recipients>",
  "sig": "<guardian's signature>"
}
```

**How release works:**
1. Guardian detects: No heartbeat for X hours
2. Guardian decrypts their share (using their nsec)
3. Guardian re-encrypts share for each recipient's npub
4. Guardian publishes release event to Nostr
5. When 3+ guardians publish: Recipients can reconstruct

**No coordination required:** Each guardian acts independently. The threshold is cryptographic (Shamir), not consensus-based.

### 6. Recipient Recovery (Fully Autonomous)

**Recovery process (no server):**
```
1. Recipient queries Nostr: kind:30080 where ["p", "<my_npub>"]
2. Finds release events from multiple guardians
3. Decrypts shares using own nsec
4. If 3+ shares: Reconstruct encryption key (Shamir)
5. Query Nostr: kind:30081 (encrypted message event)
6. Decrypt message with reconstructed key
7. Done - no server contacted
```

---

## Bitcoin Integration (Optional Layer)

### Purpose: Cryptographic Proof of Time

Bitcoin provides **unforgeable timestamps** and **programmatic release**.

### Design: Timelock Commitment

```
1. USER creates Bitcoin timelock:
   - OP_CHECKLOCKTIMEVERIFY script
   - Locks small amount of sats (dust + fees)
   - Timelock = switch expiry time

2. USER broadcasts commitment TX:
   - Proves "I set this timer at block height X"
   - Anyone can verify on any block explorer

3. When timelock matures:
   - USER can spend to prove they're alive (reset)
   - OR guardians can reference as trigger signal

4. Guardian verification:
   - Check: Is timelock TX unspent after maturity?
   - If yes: User hasn't checked in
   - Trigger release
```

### Why This Matters

- **Verifiable by anyone:** Check any block explorer
- **Unforgeable:** Can't fake Bitcoin timestamps
- **Permissionless:** No API needed, just blockchain data
- **Censorship-resistant:** Miners can't selectively block

---

## EchoLock's Role (Optional Service Provider)

### What EchoLock CAN provide:

1. **Convenience Layer:**
   - Nice UI for key generation (but keys stay local)
   - Mobile app for easy check-ins
   - Push notification reminders

2. **Guardian Service:**
   - Run one of the 5 guardians (not privileged)
   - High-availability monitoring
   - Optional, replaceable by user

3. **Relay Infrastructure:**
   - Run Nostr relays (but any relay works)
   - Redundancy, not dependency

4. **Recipient Notification:**
   - Email/SMS alerts when shares are published
   - Convenience, not requirement

### What EchoLock CANNOT do:

- Read any user's message (no keys)
- Prevent message release (not needed)
- Fake heartbeats (doesn't have user's nsec)
- Steal funds (doesn't have Bitcoin keys)
- Censor users (just one of many guardians)

### The Test:

> **If EchoLock disappears tomorrow:**
> - Users still have their keys
> - Heartbeats still publish to Nostr
> - Guardians still watch independently
> - Messages still release automatically
> - Recipients still recover messages
>
> **Nothing changes.**

---

## Migration Path

### Phase 1: User-Controlled Keys (Immediate) ✅
- [x] Move key generation to client-side (browser/CLI)
- [x] Store keys in browser IndexedDB / local keychain
- [x] Server only receives encrypted blobs + public keys
- [x] Add key export/backup functionality

### Phase 2: Nostr-Native Heartbeats (2-4 weeks) ✅
- [x] Define NIP for heartbeat events (kind 30078)
- [x] User signs heartbeats with own nsec (BIP-340 Schnorr)
- [x] Publish heartbeats to Nostr relays
- [x] Anyone can verify heartbeat status
- [ ] Remove server-side timer checking (requires Phase 3)

### Phase 3: Guardian Network (4-8 weeks) ✅
- [x] Design guardian enrollment protocol (NIP-44 encrypted shares)
- [x] Implement guardian monitoring daemon (guardian-daemon/)
- [x] Create self-hosted guardian package (guardian.example.json)
- [x] EchoLock becomes one optional guardian
- [x] Guardian management UI component

### Phase 4: Bitcoin Commitments (8-12 weeks)
- [ ] Mainnet timelock transactions
- [ ] On-chain proof of timer setting
- [ ] Verifiable by block explorers
- [ ] Optional but recommended

### Phase 5: Full Autonomy (12+ weeks)
- [ ] Recipient-side reconstruction tools
- [ ] No server needed for any operation
- [ ] Complete documentation for self-hosting
- [ ] EchoLock is fully eliminable

---

## Technical Specifications

### Cryptographic Constants
```javascript
// Encryption
const ENCRYPTION_ALGORITHM = 'AES-256-GCM';
const KEY_SIZE = 32; // 256 bits
const IV_SIZE = 12;  // 96 bits (GCM standard)
const AUTH_TAG_SIZE = 16; // 128 bits

// Key Derivation
const PBKDF2_ITERATIONS = 600000; // OWASP 2023
const PBKDF2_HASH = 'SHA-256';
const SALT_SIZE = 32;

// Shamir Secret Sharing
const TOTAL_SHARES = 5;
const THRESHOLD = 3;

// Nostr
const HEARTBEAT_KIND = 30078;
const SHARE_STORAGE_KIND = 30079;
const SHARE_RELEASE_KIND = 30080;
const MESSAGE_STORAGE_KIND = 30081;

// Bitcoin
const NETWORK = 'mainnet'; // After audit
const MIN_CONFIRMATIONS = 6;
const TIMELOCK_SAFETY_MARGIN = 144; // ~1 day of blocks
```

### Nostr Event Kinds (Proposed NIPs)
| Kind | Purpose | Publisher |
|------|---------|-----------|
| 30078 | Heartbeat | User |
| 30079 | Encrypted share storage | User |
| 30080 | Share release | Guardian |
| 30081 | Encrypted message storage | User |
| 30082 | Guardian registration | Guardian |
| 30083 | Guardian acknowledgment | Guardian |

### Guardian Protocol Messages
```
ENROLL:    User → Guardian (share + monitoring params)
ACK:       Guardian → User (confirmation)
HEARTBEAT: User → Nostr (public, signed)
WATCH:     Guardian monitors Nostr
RELEASE:   Guardian → Nostr (share for recipients)
```

---

## Security Model

### Threat Analysis

| Threat | Mitigation |
|--------|------------|
| EchoLock shutdown | System works without EchoLock |
| Guardian collusion (2) | Need 3 of 5 - no two guardians enough |
| Nostr relay censorship | 7+ relays, user can add more |
| User device compromise | Keys should be backed up encrypted |
| Recipient impersonation | NIP-44 encryption to recipient npub |
| Fake heartbeats | Signed by user's nsec (unforgeable) |
| Time manipulation | Bitcoin provides unforgeable timestamps |

### Trust Assumptions

**Must Trust:**
- Cryptographic primitives (AES-256-GCM, secp256k1, Shamir)
- User's own device security
- At least 3 of 5 guardians are honest/available

**Need NOT Trust:**
- EchoLock (or any single company)
- Any individual Nostr relay
- Any individual guardian
- Network infrastructure

---

## Success Metrics

### The Ultimate Test
1. User creates a switch
2. User stops all check-ins
3. EchoLock goes bankrupt (servers offline)
4. After timeout: Message is delivered to recipients

**If this works, we've succeeded.**

### Verification Points
- [ ] User can verify their heartbeat on any Nostr client
- [ ] Guardians can monitor without EchoLock infrastructure
- [ ] Recipients can reconstruct without contacting EchoLock
- [ ] Bitcoin commitment verifiable on any block explorer
- [ ] System functions with EchoLock completely removed

---

## References

### Nostr
- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-04: Encrypted DMs](https://github.com/nostr-protocol/nips/blob/master/04.md)
- [NIP-44: Versioned Encryption](https://github.com/nostr-protocol/nips/blob/master/44.md)
- [NIP-78: Application-specific data](https://github.com/nostr-protocol/nips/blob/master/78.md)

### Bitcoin
- [BIP-65: OP_CHECKLOCKTIMEVERIFY](https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki)
- [BIP-68: Relative Timelocks](https://github.com/bitcoin/bips/blob/master/bip-0068.mediawiki)
- [BIP-112: CHECKSEQUENCEVERIFY](https://github.com/bitcoin/bips/blob/master/bip-0112.mediawiki)

### Cryptography
- [Shamir's Secret Sharing](https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing)
- [NIST SP 800-132: Key Derivation](https://csrc.nist.gov/publications/detail/sp/800-132/final)
- [RFC 5869: HKDF](https://tools.ietf.org/html/rfc5869)

---

## For Jack Dorsey

This document represents where EchoLock MUST go to be worthy of investment.

The current implementation is a prototype that taught us what's needed. The target architecture described here is the real product - one that embodies the principles of Bitcoin and Nostr:

- **User sovereignty**
- **No trusted third parties**
- **Censorship resistance**
- **Permissionless operation**

The company becomes a convenience layer, not a dependency. Users get the benefits of a polished product while maintaining full control. If we disappear, users lose nothing.

**That's the only version worth building.**
