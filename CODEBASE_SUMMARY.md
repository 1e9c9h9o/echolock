# ECHOLOCK Codebase Summary

**Version:** 0.1.0
**Status:** Experimental / Demo
**Last Updated:** 2025-09-29

---

## Table of Contents
1. [Project Structure](#project-structure)
2. [Key Functions](#key-functions)
3. [Data Flow](#data-flow)
4. [External Dependencies](#external-dependencies)
5. [Current Limitations](#current-limitations)
6. [Extension Guide](#extension-guide)

---

## Project Structure

### Overview
```
echolock/
├── src/                    # Source code (2,144 lines)
│   ├── crypto/             # Cryptographic primitives (ISOLATED)
│   ├── bitcoin/            # Bitcoin testnet integration
│   ├── nostr/              # Nostr relay client (stubs)
│   ├── core/               # Dead man's switch orchestration
│   └── cli/                # Command-line interfaces
├── tests/                  # Jest test suite (41 tests)
├── data/                   # Local storage (demo only)
├── security/               # Security documentation
└── docs/                   # Architecture docs
```

### File-by-File Breakdown

#### `/src/crypto/` - Cryptographic Layer (ISOLATED)
**Security Boundary:** NO NETWORK ACCESS ALLOWED

| File | Lines | Purpose |
|------|-------|---------|
| `encryption.js` | 78 | AES-256-GCM encryption/decryption |
| `secretSharing.js` | 40 | Shamir Secret Sharing wrapper |
| `keyDerivation.js` | 71 | PBKDF2 key derivation |

**Key Design:** Crypto layer is isolated from network operations to prevent key leakage.

#### `/src/bitcoin/` - Bitcoin Testnet Integration

| File | Lines | Purpose |
|------|-------|---------|
| `testnetClient.js` | 294 | Main Bitcoin testnet API client |
| `timelockScript.js` | 28 | OP_CHECKLOCKTIMEVERIFY script generation |
| `feeEstimation.js` | 29 | Fee estimation utilities |
| `constants.js` | 43 | Network configuration (testnet only) |

**Key Design:** All Bitcoin operations locked to testnet. Mainnet operations disabled.

#### `/src/nostr/` - Nostr Relay Client (Stubs)

| File | Lines | Purpose |
|------|-------|---------|
| `multiRelayClient.js` | 79 | Multi-relay fragment distribution |
| `relayHealthCheck.js` | 55 | Relay availability monitoring |
| `constants.js` | 47 | Default relay URLs |

**Status:** Stubs only. Not implemented yet.

#### `/src/core/` - Dead Man's Switch Core

| File | Lines | Purpose |
|------|-------|---------|
| `deadManSwitch.js` | 361 | **MAIN ORCHESTRATOR** - Switch lifecycle |
| `coordinator.js` | 41 | High-level coordination (stub) |
| `config.js` | 46 | System configuration |

**Key Design:** Orchestrates crypto, Bitcoin, and Nostr layers.

#### `/src/cli/` - Command-Line Interfaces

| File | Lines | Purpose |
|------|-------|---------|
| `index.js` | 282 | Interactive CLI (readline-based) |
| `demo.js` | 212 | Automated crypto demo |
| `bitcoinDemo.js` | 220 | Bitcoin integration demo |
| `colors.js` | 106 | ANSI color utilities |

**Key Design:** User-facing interfaces with visual feedback.

#### `/tests/` - Test Suite

| File | Tests | Purpose |
|------|-------|---------|
| `unit/crypto.test.js` | 19 | Crypto module tests |
| `unit/basic.test.js` | 22 | Project structure validation |

**Coverage:** 41/41 tests passing. Crypto primitives fully tested.

---

## Key Functions

### Core Module: `src/core/deadManSwitch.js`

#### 1. `createSwitch(message, checkInHours, useBitcoinTimelock)`
**Purpose:** Create new dead man's switch with encryption and timelock.

**Parameters:**
- `message` (string): Secret message to protect
- `checkInHours` (number): Hours until release (default: 72)
- `useBitcoinTimelock` (boolean): Enable Bitcoin timelock (default: true)

**Process:**
1. Generate 256-bit encryption key
2. Encrypt message with AES-256-GCM
3. Split key into 5 Shamir fragments (3-of-5 threshold)
4. Create Bitcoin timelock (if enabled)
5. Store encrypted message + metadata
6. Store fragments separately

**Returns:**
```javascript
{
  switchId: "abc123...",
  expiryTime: 1727654400000,
  fragmentCount: 5,
  requiredFragments: 3,
  checkInHours: 72,
  bitcoin: { enabled, timelockHeight, address, ... }
}
```

**File:** `src/core/deadManSwitch.js:71-164`

---

#### 2. `checkIn(switchId)`
**Purpose:** Reset timer to keep switch armed.

**Process:**
1. Load switch data
2. Validate switch status (not triggered)
3. Calculate new expiry time
4. Increment check-in counter
5. Save updated state

**Returns:**
```javascript
{
  success: true,
  newExpiryTime: 1727740800000,
  checkInCount: 5,
  message: "Check-in successful"
}
```

**File:** `src/core/deadManSwitch.js:171-207`

---

#### 3. `getStatus(switchId, includeBitcoinStatus)`
**Purpose:** Get current switch status with optional live blockchain data.

**Parameters:**
- `switchId` (string): Switch identifier
- `includeBitcoinStatus` (boolean): Fetch live Bitcoin data (default: false)

**Process:**
1. Load switch data
2. Calculate time remaining
3. Check if expired → update status
4. Fetch live Bitcoin status (if requested)
5. Return comprehensive status

**Returns:**
```javascript
{
  found: true,
  switchId: "abc123...",
  status: "ARMED" | "TRIGGERED" | "RELEASED",
  timeRemaining: 259200000, // milliseconds
  checkInCount: 3,
  distributionStatus: "LOCAL",
  bitcoin: { currentHeight, timelockHeight, isValid, ... }
}
```

**File:** `src/core/deadManSwitch.js:215-278`

---

#### 4. `testRelease(switchId)`
**Purpose:** Manually trigger release for testing/demo.

**Process:**
1. Load encrypted message
2. Load fragments
3. Reconstruct key from any 3-of-5 fragments
4. Decrypt message with reconstructed key
5. Mark switch as RELEASED

**Returns:**
```javascript
{
  success: true,
  message: "Message successfully reconstructed",
  reconstructedMessage: "Your secret here...",
  sharesUsed: 3,
  totalShares: 5
}
```

**File:** `src/core/deadManSwitch.js:277-327`

---

### Crypto Module: `src/crypto/encryption.js`

#### 5. `encrypt(plaintext, key, associatedData)`
**Purpose:** Encrypt data with AES-256-GCM (authenticated encryption).

**Security:**
- Algorithm: AES-256-GCM
- Key size: 256 bits (32 bytes)
- IV size: 96 bits (12 bytes)
- Auth tag: 128 bits (16 bytes)

**Returns:**
```javascript
{
  ciphertext: Buffer,
  iv: Buffer,
  authTag: Buffer
}
```

**File:** `src/crypto/encryption.js:21-42`

---

#### 6. `decrypt(ciphertext, key, iv, authTag)`
**Purpose:** Decrypt AES-256-GCM ciphertext with authentication.

**Security:**
- Verifies authentication tag before decryption
- Prevents tampering attacks
- Constant-time comparison

**Returns:** `Buffer` (plaintext)

**File:** `src/crypto/encryption.js:50-64`

---

### Bitcoin Module: `src/bitcoin/testnetClient.js`

#### 7. `getCurrentBlockHeight()`
**Purpose:** Get current Bitcoin testnet block height from Blockstream API.

**API:** `GET https://blockstream.info/testnet/api/blocks/tip/height`

**Returns:** `number` (e.g., 4734454)

**File:** `src/bitcoin/testnetClient.js:40-43`

---

#### 8. `createTimelockScript(locktime, publicKey)`
**Purpose:** Generate OP_CHECKLOCKTIMEVERIFY Bitcoin script.

**Script Structure:**
```
<locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP <pubkey> OP_CHECKSIG
```

**Parameters:**
- `locktime` (number): Block height or Unix timestamp
- `publicKey` (Buffer): 33-byte compressed public key

**Returns:** `Buffer` (compiled script)

**File:** `src/bitcoin/testnetClient.js:107-117`

---

#### 9. `createTimelockAddress(script)`
**Purpose:** Create P2SH address from timelock script.

**Process:**
1. Hash script with HASH160
2. Create P2SH payment object
3. Generate testnet address (starts with '2')

**Returns:** `string` (e.g., "2N4a6xQsAr7HnsZ8J3hixFNR7m7nnqeHjDW")

**File:** `src/bitcoin/testnetClient.js:124-131`

---

#### 10. `getTimelockStatus(locktime)`
**Purpose:** Check if timelock is valid (live blockchain query).

**Process:**
1. Fetch current block height
2. Calculate blocks remaining
3. Fetch latest block details
4. Return validity status

**Returns:**
```javascript
{
  type: "block-height",
  locktime: 4734464,
  currentHeight: 4734454,
  blocksRemaining: 10,
  isValid: false,
  estimatedTimeRemaining: 6000000, // ms
  latestBlock: { height, timestamp, hash }
}
```

**File:** `src/bitcoin/testnetClient.js:220-242`

---

## Data Flow

### Flow 1: Switch Creation (Crypto + Bitcoin)

```
User Input
    |
    v
[CLI: create command]
    |
    v
[deadManSwitch.createSwitch()]
    |
    +---> [crypto.randomBytes(32)]  # Generate key
    |         |
    |         v
    |     [encryption.encrypt()]     # Encrypt message
    |         |
    |         v
    |     [shamir.split()]           # Split key 3-of-5
    |
    +---> [bitcoin.getCurrentBlockHeight()]
              |
              v
          [Calculate locktime height]
              |
              v
          [ECPair.fromPrivateKey()]  # Generate keys
              |
              v
          [createTimelockScript()]    # OP_CLTV script
              |
              v
          [createTimelockAddress()]   # P2SH address
    |
    v
[Save to switches.json + fragments.json]
    |
    v
Output: { switchId, bitcoin: { address, timelockHeight }, ... }
```

### Flow 2: Check-In (Timer Reset)

```
User Input: switchId
    |
    v
[deadManSwitch.checkIn()]
    |
    v
[Load switches.json]
    |
    v
[Validate: status !== "TRIGGERED"]
    |
    v
[Calculate: newExpiry = now + checkInHours]
    |
    v
[Update: lastCheckIn, expiryTime, checkInCount++]
    |
    v
[Save switches.json]
    |
    v
Output: { newExpiryTime, checkInCount }
```

### Flow 3: Status Check (with Bitcoin)

```
User Input: switchId
    |
    v
[deadManSwitch.getStatus(switchId, includeBitcoin=true)]
    |
    v
[Load switches.json]
    |
    v
[Calculate timeRemaining = expiryTime - now]
    |
    +---> [bitcoin.getTimelockStatus()]
    |         |
    |         v
    |     [Fetch current block height via API]
    |         |
    |         v
    |     [Calculate blocks remaining]
    |         |
    |         v
    |     [Return { isValid, blocksRemaining, ... }]
    |
    v
Output: { status, timeRemaining, bitcoin: { isValid, ... } }
```

### Flow 4: Release (Reconstruction + Decryption)

```
User Trigger: testRelease(switchId)
    |
    v
[Load switches.json + fragments.json]
    |
    v
[Select 3 of 5 fragments]
    |
    v
[shamir.combine(fragments[0,2,4])]  # Reconstruct key
    |
    v
[Load: ciphertext, iv, authTag]
    |
    v
[encryption.decrypt(ciphertext, reconstructedKey, iv, authTag)]
    |
    v
[Verify auth tag]
    |
    v
[Return plaintext message]
    |
    v
[Update status = "RELEASED"]
    |
    v
Output: { reconstructedMessage }
```

### Data Storage (Demo Mode)

**Location:** `/data/`

**Files:**
- `switches.json` - Switch metadata (encrypted message, timers, Bitcoin data)
- `fragments.json` - Shamir key fragments (separate file for security)

**Production:** Would use Nostr relays for geographic distribution.

---

## External Dependencies

### Production Dependencies

| Package | Version | Purpose | Security Status |
|---------|---------|---------|-----------------|
| **shamir-secret-sharing** | 0.0.4 | Shamir's Secret Sharing | ✅ Audited by Cure53 & Zellic |
| **bitcoinjs-lib** | 6.1.7 | Bitcoin protocol operations | ✅ Industry standard |
| **ecpair** | 3.0.0 | Bitcoin key pair generation | ✅ Official bitcoinjs library |
| **tiny-secp256k1** | 2.2.4 | Elliptic curve cryptography | ✅ Native bindings |
| **nostr-tools** | 2.17.0 | Nostr protocol client | ⚠️ Not yet used |
| **dotenv** | 17.2.3 | Environment configuration | ✅ Standard |

### Why Each Dependency?

#### 1. **shamir-secret-sharing** (Audited ✅)
**Why:** Implements Shamir's Secret Sharing algorithm for key splitting.

**Alternatives Considered:**
- `secrets.js` - Not actively maintained
- Custom implementation - Too risky for cryptographic code

**Security:** Audited by Cure53 (2022) and Zellic (2023). No critical issues found.

**Usage:**
```javascript
import { split, combine } from 'shamir-secret-sharing';

const key = new Uint8Array(32);
const shares = await split(key, 5, 3); // 3-of-5 threshold
const reconstructed = await combine([shares[0], shares[2], shares[4]]);
```

---

#### 2. **bitcoinjs-lib** (Industry Standard ✅)
**Why:** Bitcoin protocol operations without running a full node.

**Provides:**
- Script compilation (`bitcoin.script.compile()`)
- P2SH address generation
- Transaction building (PSBT)
- Opcodes (OP_CHECKLOCKTIMEVERIFY)

**Alternatives:**
- Run full Bitcoin node - Too heavy for demo
- bcoin - Less mature

**Usage:**
```javascript
import * as bitcoin from 'bitcoinjs-lib';

const script = bitcoin.script.compile([
  bitcoin.script.number.encode(locktime),
  bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
  bitcoin.opcodes.OP_DROP,
  publicKey,
  bitcoin.opcodes.OP_CHECKSIG
]);
```

---

#### 3. **ecpair + tiny-secp256k1** (Official ✅)
**Why:** Bitcoin key pair generation (secp256k1 curve).

**History:** Previously included in bitcoinjs-lib v5, extracted to separate package in v6.

**Usage:**
```javascript
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';

const ECPair = ECPairFactory(ecc);
const keyPair = ECPair.fromPrivateKey(privateKey, { network });
```

---

#### 4. **nostr-tools** (Not Yet Used ⚠️)
**Why:** Nostr relay communication for fragment distribution.

**Status:** Installed but not implemented.

**Planned Usage:**
- Connect to 7+ Nostr relays
- Publish encrypted fragments as Nostr events
- Geographic distribution for redundancy

---

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **jest** | 30.2.0 | Testing framework with ESM support |

**Configuration:**
- ESM mode via `NODE_OPTIONS='--experimental-vm-modules'`
- Coverage thresholds: 100% for crypto module

---

### No Vulnerabilities ✅

```bash
$ npm audit
found 0 vulnerabilities
```

All dependencies vetted and up-to-date.

---

## Current Limitations

### 1. Bitcoin Integration (Partial Implementation)

**What Works:**
- ✅ Script generation (OP_CHECKLOCKTIMEVERIFY)
- ✅ P2SH address creation
- ✅ Block height monitoring
- ✅ Fee estimation
- ✅ Testnet API integration

**What Doesn't Work:**
- ❌ Transaction broadcasting
- ❌ UTXO management
- ❌ Transaction signing with timelock
- ❌ Spending from timelocked addresses

**Impact:** Bitcoin timelocks are **not enforceable** on-chain. Timelock addresses generated but cannot be funded/spent.

**File:** `src/bitcoin/testnetClient.js:148-169`

---

### 2. Nostr Distribution (Not Implemented)

**What Exists:**
- ⚠️ Stub modules (`multiRelayClient.js`, `relayHealthCheck.js`)
- ⚠️ Relay URL constants

**What Doesn't Exist:**
- ❌ Actual relay connections
- ❌ Fragment publishing
- ❌ Fragment retrieval
- ❌ Relay health monitoring
- ❌ Geographic distribution

**Impact:** All fragments stored locally in `data/fragments.json`. Single point of failure.

**Files:**
- `src/nostr/multiRelayClient.js` (79 lines - stub)
- `src/nostr/relayHealthCheck.js` (55 lines - stub)

---

### 3. Key Management (Insecure)

**Current Behavior:**
```javascript
// src/core/deadManSwitch.js:98-100
const randomPrivateKey = crypto.randomBytes(32);
const keyPair = ECPair.fromPrivateKey(randomPrivateKey, { network });
const publicKey = keyPair.publicKey;
// Private key discarded immediately!
```

**Problem:** Private keys generated but not stored. Cannot sign transactions.

**Impact:** Cannot spend from timelock addresses even if funded.

---

### 4. Test Coverage Gaps

**What's Tested (41 tests):**
- ✅ Crypto primitives (AES, Shamir, PBKDF2)
- ✅ Project structure validation
- ✅ Module imports

**What's NOT Tested:**
- ❌ Dead man's switch integration tests
- ❌ Bitcoin timelock creation flow
- ❌ Demo scripts (CLI interaction)
- ❌ Error handling (network failures, corrupted data)
- ❌ Edge cases (expired switches, missing fragments)

**Coverage:** ~19% of codebase (crypto only)

---

### 5. Timing Vulnerabilities

**Issue:** Application timer and Bitcoin timelock are independent.

**Scenario:**
1. Application timer expires → status = "TRIGGERED"
2. Bitcoin timelock still locked (blocks remaining > 0)
3. System could attempt release before blockchain allows it

**Current Mitigation:** None. Demo only checks app timer.

**Production Need:** Enforce `status == "TRIGGERED" AND bitcoin.isValid == true`

---

### 6. Production Readiness Issues

**Storage:**
- Currently: JSON files (`data/*.json`)
- Production: Encrypted database, backup strategy

**Network:**
- Currently: Single Blockstream API endpoint
- Production: Multiple API providers, fallback nodes

**Monitoring:**
- Currently: None
- Production: Alerting, health checks, relay monitoring

**Security:**
- Currently: No audit
- Production: Professional cryptographic audit required

---

## Extension Guide

### How to Add New Features

#### Example 1: Implement Nostr Fragment Distribution

**Goal:** Replace local storage with Nostr relay publishing.

**Steps:**

1. **Update `src/nostr/multiRelayClient.js`:**

```javascript
import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool';
import { finalizeEvent, generateSecretKey } from 'nostr-tools/pure';
import WebSocket from 'ws';

useWebSocketImplementation(WebSocket);

export async function publishFragment(relayUrls, fragment, switchId) {
  const pool = new SimplePool();
  const sk = generateSecretKey(); // Generate relay signing key

  // Create Nostr event
  const event = finalizeEvent({
    kind: 30078, // Custom application data
    tags: [
      ['d', switchId], // Switch identifier
      ['expiry', fragment.expiryTime.toString()]
    ],
    content: JSON.stringify(fragment),
    created_at: Math.floor(Date.now() / 1000)
  }, sk);

  // Publish to all relays
  await Promise.all(
    pool.publish(relayUrls, event)
  );

  pool.close(relayUrls);
  return event.id;
}
```

2. **Update `src/core/deadManSwitch.js`:**

```javascript
// In createSwitch():
import { publishFragment } from '../nostr/multiRelayClient.js';

// After generating fragments (line 154):
const relayUrls = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  // ... 7+ relays
];

// Publish each fragment to all relays
for (let i = 0; i < keyShares.length; i++) {
  await publishFragment(relayUrls, {
    switchId,
    fragmentIndex: i,
    share: Buffer.from(keyShares[i]).toString('base64'),
    expiryTime
  }, switchId);
}

fragments[switchId] = {
  shares: keyShares.map(share => Buffer.from(share).toString('base64')),
  distributionStatus: 'DISTRIBUTED',
  relayCount: relayUrls.length
};
```

3. **Add retrieval function:**

```javascript
export async function retrieveFragments(relayUrls, switchId) {
  const pool = new SimplePool();

  const events = await pool.querySync(relayUrls, {
    kinds: [30078],
    '#d': [switchId]
  });

  pool.close(relayUrls);

  // Extract fragments from events
  return events.map(e => JSON.parse(e.content));
}
```

4. **Update tests:**

```javascript
// tests/integration/nostr.test.js
test('should publish and retrieve fragments from Nostr relays', async () => {
  const switchId = 'test-switch-123';
  const fragment = { share: 'abc123...', fragmentIndex: 0 };

  const eventId = await publishFragment(RELAY_URLS, fragment, switchId);
  expect(eventId).toBeDefined();

  const retrieved = await retrieveFragments(RELAY_URLS, switchId);
  expect(retrieved).toContainEqual(expect.objectContaining(fragment));
});
```

**Files to Modify:**
- `src/nostr/multiRelayClient.js` (implement)
- `src/core/deadManSwitch.js` (integrate)
- `tests/integration/nostr.test.js` (add tests)
- `package.json` (add `ws` dependency)

---

#### Example 2: Implement Bitcoin Transaction Broadcasting

**Goal:** Enable actual on-chain timelock enforcement.

**Steps:**

1. **Add key storage to `deadManSwitch.js`:**

```javascript
// Store private key securely (encrypted)
import { encrypt } from '../crypto/encryption.js';

// In createSwitch() after line 99:
const randomPrivateKey = crypto.randomBytes(32);
const keyPair = ECPair.fromPrivateKey(randomPrivateKey, { network });

// Encrypt private key with user's master key
const masterKey = await deriveKey('user-password', salt);
const encryptedPrivateKey = encrypt(randomPrivateKey, masterKey);

switches[switchId].bitcoin = {
  // ... existing fields
  encryptedPrivateKey: encryptedPrivateKey.ciphertext.toString('base64'),
  privateKeyIV: encryptedPrivateKey.iv.toString('base64'),
  privateKeyAuthTag: encryptedPrivateKey.authTag.toString('base64')
};
```

2. **Add UTXO management:**

```javascript
// src/bitcoin/utxoManager.js
export async function getUTXOs(address) {
  const response = await fetch(
    `https://blockstream.info/testnet/api/address/${address}/utxo`
  );
  return await response.json();
}

export function selectUTXOs(utxos, targetAmount) {
  // Sort by value, select smallest sufficient set
  const sorted = utxos.sort((a, b) => a.value - b.value);
  let total = 0;
  const selected = [];

  for (const utxo of sorted) {
    selected.push(utxo);
    total += utxo.value;
    if (total >= targetAmount) break;
  }

  return { selected, total };
}
```

3. **Add transaction signing:**

```javascript
// src/bitcoin/timelockSpender.js
export function createTimelockSpendingTx(utxos, timelockScript, privateKey, destAddress) {
  const psbt = new bitcoin.Psbt({ network: TESTNET });

  // Add inputs (UTXOs from timelock address)
  for (const utxo of utxos) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      sequence: 0xfffffffe, // Enable locktime
      witnessUtxo: {
        script: timelockScript,
        value: utxo.value
      }
    });
  }

  // Set locktime
  psbt.setLocktime(locktime);

  // Add output
  psbt.addOutput({
    address: destAddress,
    value: totalInput - fee
  });

  // Sign inputs
  const keyPair = ECPair.fromPrivateKey(privateKey);
  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();

  return psbt.extractTransaction().toHex();
}
```

4. **Update release flow:**

```javascript
// In testRelease() after line 310:
if (sw.bitcoinTimelock?.enabled) {
  // Check blockchain validity
  const btcStatus = await getTimelockStatus(sw.bitcoinTimelock.timelockHeight);

  if (!btcStatus.isValid) {
    return {
      success: false,
      message: `Bitcoin timelock not yet valid. ${btcStatus.blocksRemaining} blocks remaining.`
    };
  }

  // Decrypt private key
  const privateKey = decrypt(
    Buffer.from(sw.bitcoin.encryptedPrivateKey, 'base64'),
    masterKey,
    Buffer.from(sw.bitcoin.privateKeyIV, 'base64'),
    Buffer.from(sw.bitcoin.privateKeyAuthTag, 'base64')
  );

  // Get UTXOs from timelock address
  const utxos = await getUTXOs(sw.bitcoin.address);

  if (utxos.length === 0) {
    return {
      success: false,
      message: 'No funds in timelock address. Cannot broadcast proof transaction.'
    };
  }

  // Create and broadcast spending transaction
  const txHex = createTimelockSpendingTx(
    utxos,
    Buffer.from(sw.bitcoin.script, 'hex'),
    privateKey,
    'destination-address'
  );

  const txid = await broadcastTransaction(txHex);

  sw.bitcoin.spendTxid = txid;
  sw.bitcoin.spent = true;
}
```

**Files to Create:**
- `src/bitcoin/utxoManager.js` (UTXO selection)
- `src/bitcoin/timelockSpender.js` (Transaction signing)

**Files to Modify:**
- `src/core/deadManSwitch.js` (key storage, release check)
- `src/bitcoin/testnetClient.js` (ensure broadcastTransaction works)

**Tests to Add:**
```javascript
// tests/integration/bitcoin-spending.test.js
test('should spend from timelock address after expiry', async () => {
  const locktime = 4734450; // Past block
  const currentHeight = await getCurrentBlockHeight();
  expect(currentHeight).toBeGreaterThan(locktime);

  // Create and broadcast spending tx
  const txid = await spendTimelockUTXO(/* ... */);
  expect(txid).toMatch(/^[0-9a-f]{64}$/);
});
```

---

#### Example 3: Add Multi-Signature Support

**Goal:** Require multiple parties to authorize release.

**Steps:**

1. **Update switch creation:**

```javascript
// Add multisig parameter
export async function createSwitch(message, checkInHours, useBitcoinTimelock, multisigPubKeys) {
  // ...existing code...

  if (multisigPubKeys && multisigPubKeys.length >= 2) {
    // Create M-of-N multisig script
    const multisigScript = bitcoin.script.compile([
      bitcoin.opcodes.OP_2, // M = 2
      ...multisigPubKeys,   // N public keys
      bitcoin.script.number.encode(multisigPubKeys.length),
      bitcoin.opcodes.OP_CHECKMULTISIG
    ]);

    // Combine with timelock
    const combinedScript = bitcoin.script.compile([
      bitcoin.script.number.encode(locktime),
      bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.opcodes.OP_DROP,
      multisigScript
    ]);

    // Use combined script for P2SH address
    const address = createTimelockAddress(combinedScript);
  }
}
```

2. **Add signature collection:**

```javascript
// src/core/signatureCollector.js
export class SignatureCollector {
  constructor(switchId, requiredSignatures) {
    this.switchId = switchId;
    this.requiredSigs = requiredSignatures;
    this.signatures = [];
  }

  async addSignature(publicKey, signature) {
    // Verify signature
    const isValid = bitcoin.verify(messageHash, signature, publicKey);
    if (!isValid) {
      throw new Error('Invalid signature');
    }

    this.signatures.push({ publicKey, signature });

    // Check if threshold met
    if (this.signatures.length >= this.requiredSigs) {
      return { ready: true, signatures: this.signatures };
    }

    return { ready: false, count: this.signatures.length, needed: this.requiredSigs };
  }
}
```

**Use Cases:**
- Estate planning: Require lawyer + family member to release
- Corporate secrets: Require 2-of-3 executives
- Journalistic protection: Require editor + publisher

---

#### Example 4: Add Web Interface

**Goal:** Browser-based UI instead of CLI.

**Technology Stack:**
- Frontend: React + Vite
- Backend: Express API
- Database: SQLite (encrypted)

**Steps:**

1. **Create API server:**

```javascript
// src/api/server.js
import express from 'express';
import * as dms from '../core/deadManSwitch.js';

const app = express();
app.use(express.json());

app.post('/api/switches', async (req, res) => {
  const { message, checkInHours, useBitcoinTimelock } = req.body;
  const result = await dms.createSwitch(message, checkInHours, useBitcoinTimelock);
  res.json(result);
});

app.get('/api/switches/:id/status', async (req, res) => {
  const status = await dms.getStatus(req.params.id, true);
  res.json(status);
});

app.post('/api/switches/:id/checkin', (req, res) => {
  const result = dms.checkIn(req.params.id);
  res.json(result);
});

app.listen(3000, () => {
  console.log('ECHOLOCK API running on http://localhost:3000');
});
```

2. **Create React frontend:**

```jsx
// web/src/components/SwitchCreator.jsx
import { useState } from 'react';

export function SwitchCreator() {
  const [message, setMessage] = useState('');
  const [hours, setHours] = useState(72);

  const handleCreate = async () => {
    const response = await fetch('/api/switches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, checkInHours: hours, useBitcoinTimelock: true })
    });

    const result = await response.json();
    console.log('Switch created:', result.switchId);
  };

  return (
    <div>
      <textarea value={message} onChange={e => setMessage(e.target.value)} />
      <input type="number" value={hours} onChange={e => setHours(e.target.value)} />
      <button onClick={handleCreate}>Create Switch</button>
    </div>
  );
}
```

**Files to Create:**
- `src/api/server.js` (Express API)
- `web/src/App.jsx` (React app)
- `web/src/components/` (UI components)

---

### Testing Strategy for Extensions

**Unit Tests:** Test each function in isolation
```javascript
// Test function independently
test('publishFragment should return event ID', async () => {
  const eventId = await publishFragment(relays, fragment, id);
  expect(eventId).toMatch(/^[0-9a-f]{64}$/);
});
```

**Integration Tests:** Test system interactions
```javascript
// Test multiple components together
test('should create switch and distribute to Nostr', async () => {
  const result = await createSwitch(msg, 72, true);
  const retrieved = await retrieveFragments(relays, result.switchId);
  expect(retrieved).toHaveLength(5);
});
```

**End-to-End Tests:** Test full user workflows
```javascript
// Test complete flow
test('full release workflow', async () => {
  const sw = await createSwitch('secret', 0.001, false); // 3.6 seconds
  await sleep(4000);
  const status = await getStatus(sw.switchId);
  expect(status.status).toBe('TRIGGERED');
  const released = await testRelease(sw.switchId);
  expect(released.reconstructedMessage).toBe('secret');
});
```

---

### Code Style Guidelines

**1. Strict Mode:**
Every file must start with `'use strict';`

**2. Security Boundaries:**
```javascript
// SECURITY BOUNDARY: ISOLATED MODULE - NO NETWORK ACCESS ALLOWED
```

**3. Async/Await:**
Prefer async/await over callbacks/promises:
```javascript
// Good
const result = await createSwitch(msg, 72);

// Bad
createSwitch(msg, 72).then(result => { ... });
```

**4. Error Handling:**
```javascript
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  return { success: false, message: error.message };
}
```

**5. Comments:**
```javascript
/**
 * Function description
 * @param {type} name - Description
 * @returns {type} Description
 */
```

---

## Architecture Principles

### 1. Security-First Design
- Crypto layer isolated from network
- Testnet-only for Bitcoin (mainnet disabled)
- Audited libraries preferred over custom crypto
- Defense in depth (multiple verification layers)

### 2. Modularity
- Clear separation: crypto / bitcoin / nostr / core
- Each module independently testable
- Minimal coupling between layers

### 3. Fail-Safe Defaults
- Functions return safe values (never undefined)
- Graceful degradation (Bitcoin fails → crypto still works)
- Explicit error messages

### 4. Progressive Enhancement
- Core crypto works without Bitcoin/Nostr
- Bitcoin optional (can disable with flag)
- Each layer adds security without breaking previous layers

---

## Performance Considerations

**Current Performance:**
- Switch creation: ~200ms (with Bitcoin API call)
- Status check: <10ms (without Bitcoin), ~150ms (with Bitcoin)
- Release/decrypt: ~50ms

**Bottlenecks:**
1. Bitcoin API calls (network latency)
2. PBKDF2 iterations (intentionally slow: 600,000 iterations)
3. Shamir reconstruction (acceptable: <50ms)

**Optimization Opportunities:**
- Cache Bitcoin block height (update every 10 minutes)
- Batch API calls for multiple switches
- Use local Bitcoin node instead of remote API

---

## Security Checklist for Production

Before deploying to production:

- [ ] Complete professional security audit
- [ ] Implement Nostr distribution (7+ relays)
- [ ] Add Bitcoin transaction broadcasting
- [ ] Implement secure key storage (encrypted database)
- [ ] Add monitoring/alerting system
- [ ] Test on Bitcoin testnet for 30+ days
- [ ] Implement backup/recovery mechanisms
- [ ] Add rate limiting on API endpoints
- [ ] Encrypt data at rest (SQLite encryption)
- [ ] Implement proper access controls
- [ ] Test disaster recovery procedures
- [ ] Document incident response plan
- [ ] Penetration testing
- [ ] Code review by 2+ cryptographers
- [ ] Threat model validation

---

## Quick Reference

### Common Tasks

**Create a switch:**
```javascript
const result = await createSwitch("secret message", 72, true);
```

**Check status:**
```javascript
const status = await getStatus(switchId, true); // includeBitcoin
```

**Perform check-in:**
```javascript
const result = checkIn(switchId);
```

**Release (testing):**
```javascript
const released = await testRelease(switchId);
console.log(released.reconstructedMessage);
```

### File Paths

- Main entry: `src/index.js`
- Core logic: `src/core/deadManSwitch.js`
- Crypto: `src/crypto/encryption.js`
- Bitcoin: `src/bitcoin/testnetClient.js`
- CLI: `src/cli/index.js`
- Tests: `tests/unit/*.test.js`

### Key Commands

```bash
npm run cli          # Interactive CLI
npm run demo         # Crypto demo
npm run bitcoin-demo # Bitcoin demo
npm test             # Run tests
npm start            # Start CLI
```

---

**Last Updated:** 2025-09-29
**Maintainer:** See README.md
**License:** See LICENSE file
**Questions?** See [CONTRIBUTING.md](CONTRIBUTING.md) or open an issue.