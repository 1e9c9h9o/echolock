# EchoLock Self-Hosting Guide

This guide explains how to run your own EchoLock infrastructure. The system is designed so that **EchoLock the company can disappear** and everything still works.

## Architecture Overview

EchoLock has three independent layers:

```
+------------------+    +------------------+    +------------------+
|   Nostr Relays   |    |  Guardian Nodes  |    |  Bitcoin Network |
|  (Public/Yours)  |    |   (You Run)      |    |   (Immutable)    |
+------------------+    +------------------+    +------------------+
         |                      |                       |
         v                      v                       v
    Heartbeats              Monitoring              Commitments
    Share Storage           Share Release           Verification
    Message Storage         Threshold Logic         Timestamps
```

**Any layer can be self-hosted. All layers work without EchoLock.**

---

## 1. Running Your Own Guardian Daemon

The guardian daemon monitors heartbeats and releases shares when a user goes silent.

### Prerequisites

- Node.js 18+
- A Nostr private key (generate one or use existing)

### Setup

```bash
# Clone the repository
git clone https://github.com/Sandford28/echolock.git
cd echolock/guardian-daemon

# Install dependencies
npm install

# Copy the example config
cp guardian.example.json guardian.json
```

### Configuration

Edit `guardian.json`:

```json
{
  "guardianNsec": "YOUR_PRIVATE_KEY_HEX",
  "guardianNpub": "YOUR_PUBLIC_KEY_HEX",
  "relays": [
    "wss://relay.damus.io",
    "wss://relay.nostr.band",
    "wss://nos.lol"
  ],
  "checkIntervalMinutes": 5,
  "switches": []
}
```

### Generate Keys (if needed)

```javascript
// Quick key generation
const privateKey = crypto.getRandomValues(new Uint8Array(32));
const privateKeyHex = Array.from(privateKey).map(b => b.toString(16).padStart(2, '0')).join('');
console.log('Private key (keep secret):', privateKeyHex);

// Derive public key (requires secp256k1 library)
// Or use: https://nostrtool.com/ to generate
```

### Running

```bash
# Start the daemon
node index.ts

# Or with pm2 for production
pm2 start index.ts --name echolock-guardian
```

### What the Guardian Does

1. Subscribes to Nostr for heartbeat events (kind 30078)
2. Tracks last heartbeat time for each enrolled switch
3. When heartbeat exceeds threshold, releases encrypted shares (kind 30080)
4. Shares are encrypted to recipients using NIP-44

---

## 2. Using Your Own Nostr Relays

You can run your own Nostr relay for complete control.

### Recommended Relay Software

- **strfry**: High-performance C++ relay
- **nostr-rs-relay**: Rust relay with SQLite
- **nostream**: TypeScript relay

### Example: Running strfry

```bash
# Build strfry
git clone https://github.com/hoytech/strfry.git
cd strfry
make setup-golpe
make -j4

# Run
./strfry relay
```

### Configure EchoLock to Use Your Relay

In any EchoLock component, specify your relay:

```typescript
const MY_RELAYS = [
  'wss://my-relay.example.com',
  'wss://relay.damus.io',  // Keep public relays as backup
];
```

---

## 3. Standalone Message Recovery

Recipients can recover messages without any EchoLock server.

### Using the Web Tool

1. Open `recovery-tool/index.html` in any browser
2. Enter your Nostr credentials
3. Enter the switch ID
4. Click "Recover Message"

This tool:
- Queries public Nostr relays directly
- Decrypts shares in your browser
- Reconstructs the message locally
- **Never sends your private key anywhere**

### Using the Recovery Library

```typescript
import { recoverMessage } from '@echolock/recovery';

const result = await recoverMessage(
  switchId,
  senderPubkey,
  yourPubkey,
  yourPrivateKey,
  ['wss://relay.damus.io', 'wss://nos.lol']
);

if (result.success) {
  console.log('Recovered:', result.message);
}
```

### Manual Recovery (No Library)

If all else fails, you can recover manually:

1. **Find released shares** on any Nostr client:
   - Kind: 30080
   - Tag `#p`: your public key
   - Tag `#d`: starts with switch ID

2. **Decrypt each share** using NIP-44:
   - Use your private key + guardian's public key
   - ECDH shared secret + HKDF + ChaCha20-Poly1305

3. **Combine with Shamir**:
   - Need 3 of 5 shares
   - Standard GF(256) polynomial interpolation

4. **Find encrypted message**:
   - Kind: 30081
   - Tag `#d`: switch ID

5. **Decrypt with AES-256-GCM**:
   - Key from Shamir reconstruction
   - IV and authTag in message content

---

## 4. Bitcoin Verification

Bitcoin commitments provide immutable timestamps.

### Verifying a Commitment

```bash
# Using mempool.space API
curl https://mempool.space/api/tx/YOUR_TXID

# Check the OP_RETURN output for commitment hash
```

### Running Your Own Block Explorer

For full sovereignty, run your own:

- **mempool.space**: Open source block explorer
- **Electrs**: Lightweight Electrum server
- **Bitcoin Core**: Full node with RPC

---

## 5. Complete Self-Hosted Stack

For maximum independence:

```
Your Infrastructure:
├── Bitcoin Core (full node)
├── Electrs (block index)
├── mempool (explorer)
├── strfry (Nostr relay)
├── Guardian Daemon (x5 nodes)
└── Recovery Tool (static HTML)
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  nostr-relay:
    image: ghcr.io/hoytech/strfry:latest
    ports:
      - "7777:7777"
    volumes:
      - ./strfry-data:/app/strfry-db

  guardian:
    build: ./guardian-daemon
    environment:
      - GUARDIAN_CONFIG=/config/guardian.json
    volumes:
      - ./guardian-config:/config
    depends_on:
      - nostr-relay

  recovery-web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./recovery-tool:/usr/share/nginx/html:ro
```

---

## 6. Security Considerations

### Key Management

- **Never expose private keys** in config files on shared systems
- Use environment variables or secure vaults in production
- Rotate guardian keys periodically

### Relay Trust

- Public relays may filter events
- Run your own for guaranteed delivery
- Use multiple relays for redundancy

### Share Distribution

- Distribute 5 guardians across:
  - Different geographic locations
  - Different operators (friends, family, professional)
  - Different infrastructure (cloud, personal servers)

---

## 7. Testing Your Setup

### Verify Guardian Registration

```bash
# Check your guardian appears on Nostr
wscat -c wss://relay.damus.io
> ["REQ", "test", {"kinds": [30082], "authors": ["YOUR_PUBKEY"]}]
```

### Simulate Heartbeat Failure

1. Create a test switch with short threshold (e.g., 5 minutes)
2. Stop sending heartbeats
3. Verify guardians release shares after threshold

### Test Full Recovery

1. Create switch with test message
2. Stop heartbeats
3. Wait for share release
4. Use recovery tool
5. Verify message matches

---

## Need Help?

- **GitHub Issues**: https://github.com/Sandford28/echolock/issues
- **Nostr**: Post with #echolock hashtag

Remember: The goal is that this guide becomes the ONLY thing you need. EchoLock the company should be completely optional.
