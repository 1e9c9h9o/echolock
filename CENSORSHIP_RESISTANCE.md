# Censorship Resistance: Why Shutting Down the Website Doesn't Stop Your Switch

## The Attack Scenario

**You're absolutely right to ask this!**

> "What if someone (government, hacker, adversary) shuts down the ECHOLOCK website/API server to prevent my message from being released?"

This is a **critical threat model** that ECHOLOCK is designed to resist.

---

## How Traditional Dead Man's Switches FAIL

### Centralized Architecture (Vulnerable)

```
Your Secret
    ↓
Central Server (single point of failure)
    ↓
Recipient

❌ Shut down server = Switch stops working
❌ Server compromise = Secrets exposed
❌ Court order = Forced shutdown
❌ DDoS attack = Service unavailable
```

**This is why most dead man's switches are unreliable.**

---

## How ECHOLOCK is Different

### Decentralized Architecture (Resilient)

```
Your Secret
    ↓
Encrypted Locally (AES-256-GCM)
    ↓
Split into 5 Fragments (Shamir 3-of-5)
    ↓
Distributed to 10+ Nostr Relays Worldwide
    ↓
(Optional) Bitcoin Blockchain Timelock
    ↓
Anyone with password can retrieve & decrypt

✅ Relays are independent (no single owner)
✅ Geographic distribution (different countries)
✅ 3-of-5 threshold (only need 3 relays alive)
✅ Bitcoin timelock (mathematically guaranteed)
✅ Open protocol (anyone can retrieve)
```

---

## What Happens If Website Shuts Down

### Scenario 1: API Server Goes Offline

**What still works:**

1. ✅ **Fragments remain on Nostr relays** (independent servers worldwide)
2. ✅ **Bitcoin timelock continues** (blockchain is unstoppable)
3. ✅ **Anyone can retrieve fragments** (public Nostr protocol)
4. ✅ **Manual decryption possible** (open source tools)

**What you lose:**

- ❌ Automatic timer monitoring (no cron job)
- ❌ Automatic email sending
- ❌ Web UI for check-ins

**But you can still:**

✅ Run your own instance of the code
✅ Manually retrieve fragments from Nostr
✅ Use the CLI tool locally
✅ Write custom retrieval scripts

---

## The Three Layers of Censorship Resistance

### Layer 1: Nostr Relay Distribution (Geographically Decentralized)

**Your fragments are stored on 7+ independent Nostr relays:**

```
Fragment 1 → wss://relay.damus.io (USA)
Fragment 2 → wss://nos.lol (Europe)
Fragment 3 → wss://relay.nostr.band (Global CDN)
Fragment 4 → wss://nostr.wine (Unknown location)
Fragment 5 → wss://relay.snort.social (Decentralized)
Fragment 6 → wss://nostr.mom (Independent)
Fragment 7 → wss://relay.current.fyi (Community-run)
```

**Key properties:**

- Each relay is run by **different operators**
- Located in **different jurisdictions**
- No single entity controls all relays
- Shutting down 4 relays still leaves 3 (enough to decrypt)

**Attack resistance:**

- ❌ Can't shut down all relays (different owners)
- ❌ Can't get court orders in all countries
- ❌ Can't DDoS all relays simultaneously
- ✅ Only need 3 of 7 to survive

---

### Layer 2: Bitcoin Timelock (Mathematically Guaranteed)

**When enabled, ECHOLOCK creates a Bitcoin transaction with OP_CHECKLOCKTIMEVERIFY:**

```solidity
OP_CHECKLOCKTIMEVERIFY <future_block_height>
OP_DROP
<your_pubkey>
OP_CHECKSIG
```

**What this means:**

- Funds locked until specific Bitcoin block height
- **No one can prevent blocks from being mined** (not even governments)
- Block height is **objective proof** that time has passed
- Anyone can verify on the blockchain

**Example:**

```
Current block: 850,000
Timer: 72 hours (~72 blocks)
Timelock height: 850,072

When block 850,072 is mined:
✅ Mathematically provable that 72 hours passed
✅ Transaction becomes spendable
✅ Encrypted private key unlocks
✅ Can retrieve and decrypt message
```

**Attack resistance:**

- ❌ Can't stop Bitcoin mining
- ❌ Can't reverse blockchain
- ❌ Can't prevent block propagation
- ✅ Unstoppable proof of time passage

---

### Layer 3: Open Source + Self-Hosting

**The entire codebase is open source (G:\ECHOLOCK):**

```bash
# Anyone can run their own instance
git clone https://github.com/yourusername/echolock.git
cd echolock
npm install
npm run api

# Now YOU control the server
# No central authority can shut you down
```

**What this enables:**

1. **Self-hosted instances** - Run on your own server
2. **Fork the code** - Customize for your needs
3. **Manual operation** - Use CLI without API
4. **Recovery tools** - Write custom scripts

---

## Real-World Attack Scenarios

### Attack 1: "Shut Down EchoLock.com"

**Attacker:** Government issues takedown order

**Impact:**
- ❌ echolock.com website goes offline
- ❌ Central API server stops

**Your switch still works because:**
- ✅ Fragments on 7 independent Nostr relays
- ✅ Bitcoin timelock on blockchain (unstoppable)
- ✅ You can run local CLI: `npm run cli`
- ✅ You can self-host API server
- ✅ Anyone can retrieve fragments (public protocol)

**Recovery steps:**
```bash
# 1. Clone repo
git clone https://github.com/echolock/echolock.git

# 2. Run locally
npm install
npm run cli

# 3. Retrieve your switch
> list
> select <your-switch-id>
> test-release
Enter password: ****
[Shows decrypted message]
```

---

### Attack 2: "Delete Database"

**Attacker:** Hacker destroys PostgreSQL database

**Impact:**
- ❌ Website can't show your switches
- ❌ Automatic monitoring stops

**Your switch still works because:**
- ✅ Fragments are NOT in database (on Nostr relays)
- ✅ Only metadata is in database
- ✅ Your encrypted message is on Nostr
- ✅ Can retrieve using Nostr public key

**Recovery:**
You need to know:
1. Your Nostr public key (npub...)
2. Your encryption password

Then:
```javascript
// Custom recovery script
import { retrieveFragmentsFromNostr } from './src/nostr/multiRelayClient.js';
import { combineAuthenticatedShares } from './src/crypto/secretSharing.js';
import { decrypt } from './src/crypto/encryption.js';

// 1. Retrieve fragments from Nostr
const fragments = await retrieveFragmentsFromNostr(nostrPubkey);

// 2. Reconstruct secret
const secret = await combineAuthenticatedShares(fragments);

// 3. Decrypt message
const message = await decrypt(encryptedData, secret);
console.log(message);
```

---

### Attack 3: "Take Down All 7 Nostr Relays"

**Attacker:** Coordinates attacks on all relays simultaneously

**Impact:**
- ⚠️ Fragments temporarily unavailable
- ⚠️ Can't retrieve from Nostr

**Your switch still works because:**
- ✅ Shamir Secret Sharing requires only 3 of 5 fragments
- ✅ 7+ relays distributed globally
- ✅ Relays mirror each other (redundancy)
- ✅ Can add more relays dynamically
- ✅ Fallback to local storage

**Likelihood:** Near impossible because:
- Relays in different countries (different laws)
- Different owners (no central control)
- Different hosting providers
- Different jurisdictions
- Community-run (volunteer infrastructure)

---

### Attack 4: "Block Internet Access"

**Attacker:** Adversary blocks your internet connection

**Impact:**
- ❌ Can't check in to reset timer
- ❌ Can't access API server

**Your switch WORKS AS INTENDED because:**
- ✅ This is the **dead man's switch scenario**!
- ✅ Inability to check in → Timer expires
- ✅ Message gets released automatically
- ✅ Exactly what you want if you're imprisoned/killed/silenced

---

### Attack 5: "Steal Encryption Password"

**Attacker:** Compromises your password

**Impact:**
- ❌ Can decrypt message early
- ⚠️ This is a genuine threat

**Mitigations:**
- ✅ Use strong password (PBKDF2 600k iterations)
- ✅ Store password securely (password manager)
- ✅ Don't share password
- ✅ Optional: Multi-factor key derivation

**Note:** This is the ONLY attack that can decrypt your message early.

---

## How to Maximize Censorship Resistance

### 1. Enable Bitcoin Timelock

```env
USE_BITCOIN_TIMELOCK=true
```

**Benefits:**
- Blockchain-verified timing
- Cannot be stopped by anyone
- Mathematical proof of time

**Limitations:**
- Only works on Bitcoin testnet (until audit)
- Requires Bitcoin testnet funds (~$0)

---

### 2. Use More Nostr Relays

```env
# Add 20+ relays (more = better redundancy)
NOSTR_RELAYS=wss://relay1.com,wss://relay2.com,...,wss://relay20.com
```

**Best practices:**
- Mix of geographic locations
- Different operators
- Community-run + commercial
- Tor hidden services (censorship-resistant)

---

### 3. Self-Host Your API

```bash
# Deploy to your own VPS
git clone https://github.com/echolock/echolock.git
cd echolock

# Configure environment
cp .env.example .env
nano .env

# Start API server
npm run api

# Now YOU control it (no central authority)
```

**Benefits:**
- Full control
- No external dependencies
- Can't be shut down by others
- Run on Tor hidden service

---

### 4. Distribute Instructions to Trusted Parties

Create a **recovery document** for your recipients:

```markdown
# ECHOLOCK Emergency Recovery Instructions

If you can't access echolock.com:

1. Clone repository:
   git clone https://github.com/echolock/echolock.git

2. Install dependencies:
   npm install

3. Retrieve fragments from Nostr:
   My Nostr public key: npub1abc123def456...

4. Run recovery script:
   node recovery.js --pubkey npub1abc... --password [provided separately]

5. Your decrypted message will appear on screen

Password location: [safety deposit box / encrypted USB / trusted friend]
```

Give this to your recipients so they can recover even if you're gone.

---

### 5. Use Tor Hidden Service (Maximum Resistance)

```bash
# Run ECHOLOCK as Tor hidden service
# Cannot be taken down or censored

# Install Tor
sudo apt install tor

# Configure hidden service
sudo nano /etc/tor/torrc
# Add:
HiddenServiceDir /var/lib/tor/echolock/
HiddenServicePort 80 127.0.0.1:3000

# Restart Tor
sudo systemctl restart tor

# Get .onion address
sudo cat /var/lib/tor/echolock/hostname
# youraddress.onion

# Now accessible via Tor Browser
# Extremely censorship-resistant
```

---

## The Nuclear Option: Manual Decryption

**Worst case scenario:** Everything is offline (API, Nostr relays, internet).

**You can STILL decrypt if you have:**

1. ✅ Your password
2. ✅ Access to Nostr (via any Nostr client)
3. ✅ Your Nostr public key (saved somewhere)

**Steps:**

```bash
# 1. Use any Nostr client (browser, CLI, mobile app)
# 2. Query for your events:
{
  "kinds": [30078],
  "authors": ["your-npub"],
  "#d": ["echolock-fragment"]
}

# 3. Download fragment events
# 4. Run local decryption script:
node manual-decrypt.js \
  --fragments fragments.json \
  --password "your-password"

# 5. See your decrypted message
```

**This works even if:**
- ❌ ECHOLOCK website is gone
- ❌ API server is offline
- ❌ Database is destroyed
- ❌ Original server is seized

As long as Nostr relays exist and you have your password, you can decrypt.

---

## Comparison to Alternatives

| Feature | ECHOLOCK | Traditional Dead Man's Switch | Lawyer with Sealed Envelope |
|---------|----------|-------------------------------|----------------------------|
| **Central server vulnerability** | ✅ No single server | ❌ Single point of failure | ❌ Single location |
| **Government seizure** | ✅ Can't seize Nostr | ❌ Can seize server | ❌ Can get court order |
| **Geographic distribution** | ✅ 7+ countries | ❌ One datacenter | ❌ One office |
| **Blockchain proof** | ✅ Bitcoin timelock | ❌ No | ❌ No |
| **Self-hostable** | ✅ Open source | ❌ Proprietary | ❌ N/A |
| **Manual recovery** | ✅ Always possible | ❌ No | ⚠️ If lawyer cooperates |
| **Cost** | ✅ Free (self-hosted) | 💰 Subscription | 💰💰 Expensive |

---

## Real-World Resilience Test

**Let's simulate a coordinated attack:**

### Day 1: Adversary Actions
- 🔥 Gets court order, shuts down echolock.com
- 🔥 Seizes API server
- 🔥 Deletes PostgreSQL database
- 🔥 DDoS attacks 3 Nostr relays

### Your Switch Status:
- ✅ 4 Nostr relays still alive (only need 3)
- ✅ Bitcoin timelock counting down (unstoppable)
- ✅ Fragments still encrypted
- ✅ Timer still running

### Day 3 (72 hours later):
- ✅ Bitcoin block height reached
- ✅ Timelock unlocked
- ✅ Anyone with password can retrieve
- ✅ You (or trusted party) run local CLI
- ✅ Retrieve fragments from remaining relays
- ✅ Decrypt message
- ✅ **Mission accomplished!**

**Adversary FAILED to prevent release.**

---

## Conclusion: Why ECHOLOCK is Censorship-Resistant

### The website CAN be shut down, but:

1. ✅ **Fragments persist** on independent Nostr relays worldwide
2. ✅ **Bitcoin timelock** is mathematically guaranteed
3. ✅ **Open source** means anyone can run it
4. ✅ **Decentralized storage** means no single point of failure
5. ✅ **Manual recovery** always possible with password
6. ✅ **Self-hosting** removes dependency on central authority

### What you MUST protect:

- 🔑 Your encryption password (this is the ONLY weak point)
- 📝 Your Nostr public key (for recovery)
- 💾 Recovery instructions for recipients

### What adversaries CAN'T stop:

- ⛔ Bitcoin blockchain mining
- ⛔ Nostr relays in other countries
- ⛔ Mathematical time passage
- ⛔ Open source code distribution
- ⛔ Cryptographic guarantees

---

**The answer to your question:**

> "Can't the website just be shut down?"

**Yes, the website can be shut down.**

**But your dead man's switch will STILL work** because the critical components (Nostr fragments, Bitcoin timelock, encryption) are **decentralized and censorship-resistant**.

That's the whole point of ECHOLOCK! 🛡️
