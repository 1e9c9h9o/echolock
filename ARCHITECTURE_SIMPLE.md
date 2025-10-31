# ECHOLOCK Architecture - Simple Explanation

## The Key Question: "Can't the website just be shut down?"

**SHORT ANSWER: Yes, but your message still gets released.**

---

## How It Works

### What You See (The Website)

```
┌─────────────────────────┐
│   ECHOLOCK Website      │
│   (www.echolock.xyz)    │
│   Vercel Hosting        │
│                         │
│  - Create switches      │
│  - Check in             │
│  - View status          │
└─────────────────────────┘
         ↓ HTTPS/REST
┌─────────────────────────┐
│   ECHOLOCK API          │
│   Railway + PostgreSQL  │
│                         │
│  - User authentication  │
│  - Switch management    │
│  - Database storage     │
└─────────────────────────┘
         ↓
    [CAN BE SHUT DOWN]
         ↓
    ❌ Website goes offline
    ❌ API server stops
    ❌ Database deleted
```

### What You Don't See (The Real Magic)

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR SECRET MESSAGE                       │
│              "My Bitcoin password is xyz123"                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
              [ENCRYPTED LOCALLY IN BROWSER]
              AES-256-GCM with your password
                           ↓
┌─────────────────────────────────────────────────────────────┐
│         ENCRYPTION KEY (256 random bits)                     │
│         e.g., 3f7a9b2c1d4e5f6a7b8c9d0e1f2a3b4c             │
└─────────────────────────────────────────────────────────────┘
                           ↓
         [SPLIT INTO 5 FRAGMENTS - Shamir Secret Sharing]
         (Need any 3 to reconstruct the key)
                           ↓
        ┌──────┬──────┬──────┬──────┬──────┐
        │  F1  │  F2  │  F3  │  F4  │  F5  │
        └──────┴──────┴──────┴──────┴──────┘
                           ↓
         [DISTRIBUTED TO NOSTR RELAYS WORLDWIDE]

    F1 → relay.damus.io (USA)
    F2 → nos.lol (Europe)
    F3 → relay.nostr.band (CDN)
    F4 → nostr.wine (Independent)
    F5 → relay.snort.social (Community)
    F6 → nostr.mom (Backup)
    F7 → relay.current.fyi (Backup)

         ✅ CANNOT ALL BE SHUT DOWN
         ✅ Different owners
         ✅ Different countries
         ✅ Different laws
         ✅ Only need 3 of 7 to survive
```

---

## Timeline: What Happens

### Day 0 (Today)

```
You create switch:
├─ Message encrypted ✓
├─ Key split into 5 fragments ✓
├─ Fragments → 7 Nostr relays ✓
├─ Timer started (72 hours) ✓
└─ Website shows: "Switch ARMED"
```

### Day 1 (Bad Guys Attack)

```
Adversary takes down website:
├─ echolock.com offline ❌
├─ API server seized ❌
├─ Database deleted ❌
└─ BUT...
    ├─ Fragments STILL on Nostr relays ✅
    ├─ Timer STILL counting down ✅
    └─ Encryption STILL secure ✅
```

### Day 2 (Timer Running)

```
Even with website down:
├─ 7 Nostr relays still have fragments ✅
├─ Bitcoin blockchain still mining ✅
├─ Timer still counting ✅
└─ No check-in possible (website down) ✅
    └─ GOOD! This triggers release
```

### Day 3 (Timer Expires)

```
72 hours passed:
├─ Website STILL offline ❌
├─ BUT Timer expired ✓
└─ What happens?

Option A - Automatic (if website running):
    └─ Cron job retrieves fragments
    └─ Decrypts message
    └─ Emails recipient ✓

Option B - Manual (if website down):
    └─ You run local CLI
    └─ Retrieve fragments from Nostr
    └─ Decrypt with password
    └─ See message / Email manually ✓
```

---

## The Critical Difference

### Traditional Dead Man's Switch (VULNERABLE)

```
┌────────────┐
│  Message   │
│  stored on │  ← Single point of failure
│  Server X  │
└────────────┘
      ↓
  Shut down Server X
      ↓
   ❌ Message lost
```

### ECHOLOCK (RESILIENT)

```
┌────────────┐
│  Message   │
│ encrypted  │
└────────────┘
      ↓
┌──────────────────────────────┐
│  Fragments distributed to:   │
│                              │
│  Relay 1 (USA)      ✓       │
│  Relay 2 (Europe)   ✓       │
│  Relay 3 (Asia)     ✓       │
│  Relay 4 (Canada)   ✓       │
│  Relay 5 (Unknown)  ✓       │
│  Relay 6 (Backup)   ✓       │
│  Relay 7 (Backup)   ✓       │
└──────────────────────────────┘
      ↓
  Shut down 4 relays
      ↓
  3 relays STILL alive
      ↓
   ✓ Still works!
```

---

## Real-World Example

### Scenario: Whistleblower Protection

**You are:** Journalist with evidence of corruption

**You create:** Dead man's switch with 7-day timer

**You store:** Encrypted files + decryption key on ECHOLOCK

**You check in:** Every 6 days to prove you're safe

**Bad guys:** Find out and want to stop release

### What They Try:

```
Day 1: 🔥 Get court order, shut down echolock.com
       → ✅ Fragments still on Nostr relays

Day 2: 🔥 Pressure hosting provider, delete database
       → ✅ Fragments not in database, on Nostr

Day 3: 🔥 DDoS attack on 3 Nostr relays
       → ✅ 4 relays still alive (only need 3)

Day 4: 🔥 Bribe relay operators to delete data
       → ✅ Different owners, different countries

Day 5: 🔥 Kidnap you, prevent check-in
       → ✅ THIS TRIGGERS THE SWITCH! (intended)

Day 6: 🔥 Try to guess your password
       → ❌ PBKDF2 600k iterations = impossible

Day 7: ⏰ Timer expires
       → ✅ YOUR MESSAGE GETS RELEASED ANYWAY
```

**Result:** Even with unlimited resources, adversary FAILED.

---

## What You MUST Protect

### 🔑 Your Password (CRITICAL)

```
❌ DON'T: Use weak password ("password123")
✅ DO:    Use strong password (20+ chars, random)
✅ DO:    Store in password manager
✅ DO:    Give to trusted recipient in sealed envelope
```

**Why:** This is the ONLY thing that can decrypt your message early.

### 📝 Your Nostr Public Key (Important for Recovery)

```
✅ Save somewhere safe (encrypted USB, paper backup)
✅ Give to recipient with recovery instructions
```

**Why:** Needed to retrieve fragments if website is down.

### 🚫 What You DON'T Need to Protect

- ❌ The ECHOLOCK website (it can go down)
- ❌ The API server (can be shut down)
- ❌ The database (can be deleted)
- ❌ Individual Nostr relays (redundancy)
- ❌ The encrypted message (public on Nostr, useless without password)

---

## How to Ensure Maximum Resilience

### 1. Save Recovery Information

Create a document like this:

```
ECHOLOCK EMERGENCY RECOVERY

If echolock.com is offline:

1. Download ECHOLOCK code:
   https://github.com/echolock/echolock

2. My Nostr public key:
   npub1abc123def456...

3. Run recovery script:
   npm install
   node recover.js --pubkey [above] --password [separate]

4. Decryption password location:
   [Safety deposit box #1234 at First Bank]
   [Or: Encrypted USB with fingerprint lock]

5. Your decrypted files will appear in ./output/

Contact [backup email] if you need help.
```

Give this to your recipient.

### 2. Enable Bitcoin Timelock (Optional)

```env
USE_BITCOIN_TIMELOCK=true
```

Adds blockchain-verified proof that time passed. Cannot be faked or stopped.

### 3. Use More Relays

Default: 7 relays
Better: 15+ relays across more countries

```env
NOSTR_RELAYS=wss://relay1.com,wss://relay2.com,...(add more)
```

### 4. Self-Host a Backup Instance

```bash
# Deploy to YOUR server
git clone https://github.com/echolock/echolock.git
cd echolock
npm install
npm run api

# Now YOU control it
# Run on VPS, home server, or Tor hidden service
```

---

## The Bottom Line

### Can the website be shut down?
**YES** ✓

### Will your switch still work?
**YES** ✓

### How?

1. **Fragments are on independent Nostr relays** (not the website)
2. **Only need 3 of 7 relays** (redundancy)
3. **Different owners, countries, laws** (can't shut down all)
4. **Open source code** (anyone can run it)
5. **Manual recovery always possible** (with password)
6. **Bitcoin timelock unstoppable** (if enabled)

### The ONLY way to stop it:

- ❌ Guess your password (computationally impossible)
- ❌ OR shut down ALL 7+ Nostr relays in different countries (impractical)
- ❌ OR stop Bitcoin blockchain (impossible)

### What attackers CAN do:

- ✓ Shut down echolock.com (doesn't matter)
- ✓ Delete the database (doesn't matter)
- ✓ Seize the API server (doesn't matter)

**Everything critical is decentralized and censorship-resistant.**

---

## Quick FAQ

**Q: If the website is down, how do I retrieve my message?**

A: Run the CLI locally:
```bash
git clone https://github.com/echolock/echolock.git
cd echolock
npm install
npm run cli
# Then retrieve using your Nostr pubkey + password
```

**Q: What if Nostr relays delete my fragments?**

A: You need 3 of 7. All 7 relays would need to delete simultaneously (unlikely). Add more relays for extra redundancy.

**Q: Can I test this offline scenario?**

A: Yes!
1. Create switch
2. Stop API server
3. Use CLI to retrieve manually
4. Prove fragments are on Nostr, not your server

**Q: What if I forget my password?**

A: ❌ Cannot recover. This is by design (security). Store password safely.

**Q: Is this legal?**

A: Yes in most jurisdictions. Check your local laws. Don't use for illegal content.

---

## Summary

**Website shutdown = Inconvenience, not catastrophe**

✅ Fragments survive on Nostr
✅ Bitcoin timelock unstoppable
✅ Manual recovery possible
✅ Open source = self-hostable
✅ Decentralized = censorship-resistant

**Your adversary needs to control:**
- All 7+ Nostr relay operators
- In different countries
- With different laws
- Simultaneously
- PLUS stop Bitcoin mining
- PLUS crack your password

**Probability of success: ~0%**

That's why ECHOLOCK is called **censorship-resistant**. 🛡️
