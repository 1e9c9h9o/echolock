# EchoLock User Guide

EchoLock is a dead man's switch. It delivers a message to someone you choose, but only if you stop checking in.

---

## How It Works

```
You create a switch:
  - Write a secret message
  - Choose who receives it (recipient)
  - Choose 5 people to watch for your check-ins (guardians)
  - Set how often you need to check in (1-7 days)

While you're checking in:
  - Nothing happens
  - Your message stays encrypted
  - No one can read it

If you stop checking in:
  - Guardians notice independently
  - They release their key pieces
  - Recipient combines 3 pieces to unlock your message
```

---

## Key Concepts

### Heartbeat (Check-in)

A heartbeat is proof you're still active. You send one by:
- Clicking a button in the app
- Clicking a link in an email reminder
- Using the API

Each heartbeat resets your timer. If no heartbeat arrives before the timer expires, the release process begins.

### Guardians

Guardians are people or services who:
1. Hold one piece of your encryption key
2. Watch for your heartbeats
3. Release their piece if you go silent

You need 5 guardians. They can be:
- **Family**: Sister, brother, parent, spouse
- **Friends**: Someone you trust
- **Professionals**: Lawyer, accountant, executor
- **Services**: EchoLock (optional), other dead man's switch services
- **Self-hosted**: Your own server running the guardian daemon

**Why 5 guardians?**
Your encryption key is split into 5 pieces using a system where any 3 pieces can rebuild the key, but 2 pieces reveal nothing. This means:
- If 2 guardians lose their piece or go offline, recovery still works
- If 2 guardians collude, they still can't read your secret

### Recipients

Recipients are who receive your message when released. They need:
- A Nostr keypair (public/private key)
- Access to the internet

When guardians release their key pieces, recipients:
1. Collect 3+ pieces from public Nostr relays
2. Decrypt each piece with their private key
3. Combine pieces to reconstruct the encryption key
4. Decrypt your message

### Threshold

The threshold is how long you can go without checking in before release begins. Options typically range from 24 hours to 7 days. Choose based on:
- How often you're normally online
- How urgent the message is
- How much buffer you want for travel, illness, etc.

---

## Getting Started

### 1. Create an Account

Go to [echolock.xyz](https://echolock.xyz) and sign up. You'll get a Nostr keypair automatically, or you can import your own.

**Your private key stays on your device.** EchoLock never sees it.

### 2. Understand What You're Setting Up

Before creating a switch, you need to decide:
- **What message** you want to deliver
- **Who receives it** (you'll need their Nostr public key, or they can sign up)
- **Who your 5 guardians are** (names and Nostr public keys)
- **How often** you can reliably check in

### 3. Gather Guardian Public Keys

Each guardian needs a Nostr keypair. Options:
- They already use Nostr (get their npub)
- They sign up on EchoLock (they'll get a keypair)
- They generate keys using any Nostr client
- They run their own guardian daemon

You don't need to coordinate with guardians before setup. When you create the switch, encrypted shares are sent to their public keys. They'll receive a notification to accept or decline.

---

## Creating a Switch

### Step 1: Write Your Message

This is the content that will be delivered. It could be:
- Passwords and account credentials
- Location of physical items (safe, documents)
- Instructions for your family
- A personal message

**The message is encrypted on your device before anything is sent anywhere.**

### Step 2: Add Recipient(s)

Enter the Nostr public key (npub) of each person who should receive the message. They'll be able to decrypt it once 3+ guardians release their shares.

### Step 3: Configure Guardians

For each of your 5 guardians, provide:
- A name (for your reference)
- Their Nostr public key (npub)

Suggested distribution:
```
Guardian 1: Family member
Guardian 2: Close friend
Guardian 3: Professional (lawyer, accountant)
Guardian 4: Another trusted person
Guardian 5: EchoLock service (or another service, or self-hosted)
```

The system works if any 3 guardians respond. Diversity protects against:
- One person being unreachable
- One service going offline
- Technical failures

### Step 4: Set Check-in Interval

Choose how often you need to check in:
- **24 hours**: For urgent or time-sensitive information
- **3 days**: Balanced option, accounts for weekends
- **7 days**: For less urgent situations, more buffer

You'll receive reminders before each deadline.

### Step 5: Review and Create

Before confirming:
1. Verify message content
2. Confirm recipient keys are correct
3. Verify guardian keys are correct
4. Understand the check-in commitment

Once created:
- Your message is encrypted with a new key
- The key is split into 5 shares
- Each share is encrypted to a guardian's public key
- Shares are published to Nostr relays
- Guardians are notified
- Your timer starts

---

## Managing Your Switch

### Checking In

You can check in via:
- **Dashboard**: Click "Check In" on your switch
- **Email**: Click the link in reminder emails
- **Mobile**: Use the app (coming soon)
- **API**: POST to `/api/heartbeat` with your signature

Each check-in:
1. Signs a heartbeat message with your private key
2. Publishes it to Nostr relays
3. Guardians see it and reset their timers

### Modifying a Switch

You can update:
- **Message content**: Creates new encryption, new shares
- **Recipients**: Requires new share distribution
- **Check-in interval**: Takes effect immediately

You cannot change guardians without creating a new switch. This is by design—guardians already hold shares.

### Pausing a Switch

If you'll be unavailable (surgery, remote travel, etc.):
1. Check in before you leave
2. Extend your interval temporarily
3. Notify guardians if appropriate

There's no "pause" button because that would require trusting EchoLock to honor it. Instead, extend your interval.

### Deleting a Switch

When you delete a switch:
- Your encrypted message is removed from Nostr
- Guardians are notified to delete their shares
- Recipients can no longer recover it

Note: Deletion requests are sent, but guardians may have already downloaded shares. True deletion depends on guardian compliance.

---

## When a Switch Triggers

### What Happens

1. **Detection** (automatic)
   - Each guardian independently notices no heartbeat
   - No coordination needed between guardians
   - Each decides on their own

2. **Share Release** (automatic)
   - Guardians publish their encrypted shares to Nostr
   - Shares are encrypted to recipient public keys
   - Published publicly but only recipients can decrypt

3. **Reconstruction** (by recipient)
   - Recipient collects shares from Nostr relays
   - Decrypts each share with their private key
   - Combines 3+ shares to get the encryption key

4. **Decryption** (by recipient)
   - Recipient fetches encrypted message from Nostr
   - Decrypts with reconstructed key
   - Message is revealed

### How Long Does This Take?

- Guardian detection: Immediate once threshold passes
- Share release: Within minutes
- Recipient recovery: As fast as they act

### False Triggers

If you simply forgot to check in:
- You can check in again to stop further releases
- Already-released shares cannot be recalled
- If 3+ shares released, recipient may already have access

This is why choosing the right interval matters.

---

## For Recipients: Recovering a Message

If you're a recipient and a switch has triggered:

### Using the Web Recovery Tool

1. Go to [echolock.xyz/recover](https://echolock.xyz/recover) or open `recovery-tool/index.html` locally
2. Enter your Nostr private key (never sent anywhere—decryption happens in your browser)
3. Enter the switch ID (provided by the sender, or found in notification)
4. Click "Recover"

The tool:
- Queries public Nostr relays for released shares
- Decrypts shares locally in your browser
- Reconstructs the encryption key
- Decrypts and displays the message

### Manual Recovery (No EchoLock Required)

If echolock.xyz is down, you can recover using any Nostr client:

1. **Find released shares**
   - Event kind: 30080
   - Tagged with your public key (`#p`)
   - Contains `d` tag with switch ID

2. **Decrypt each share**
   - Use NIP-44 decryption
   - Your private key + guardian's public key
   - Result is a Shamir share

3. **Combine shares**
   - Need 3 of 5 shares
   - Use Shamir's Secret Sharing (GF256)
   - Result is the encryption key

4. **Find encrypted message**
   - Event kind: 30081
   - Tagged with switch ID (`#d`)

5. **Decrypt message**
   - AES-256-GCM
   - Key from step 3
   - IV and auth tag in event content

Libraries for manual recovery:
- `@noble/secp256k1` for NIP-44
- Any Shamir library (GF256)
- WebCrypto API for AES-GCM

---

## For Guardians: What You Need to Do

If someone chose you as a guardian:

### Automated (Recommended)

Use EchoLock or another guardian service:
1. Accept the guardian invitation
2. The service handles monitoring and release automatically
3. You don't need to do anything

### Self-Hosted

Run your own guardian daemon:
1. Clone the EchoLock repository
2. Configure `guardian-daemon/guardian.json` with your keys
3. Run the daemon (see [SELF_HOSTING.md](./SELF_HOSTING.md))
4. It monitors heartbeats and releases shares automatically

### Manual (Not Recommended)

If you're a guardian without automation:
1. Periodically check Nostr for the user's heartbeats (kind 30078)
2. If no heartbeat for longer than the threshold, publish your share (kind 30080)
3. Encrypt the share to recipient public keys using NIP-44

This is error-prone. Automated guardians are strongly recommended.

---

## Security Considerations

### What EchoLock Can See

- Your public key
- Encrypted blobs (unreadable without your key)
- When you check in (public heartbeats)
- Who your guardians and recipients are (public keys only)

### What EchoLock Cannot See

- Your private key (never leaves your device)
- Your message content (encrypted client-side)
- The encryption key (split before leaving your device)

### What Happens If EchoLock Disappears

Nothing changes:
- Your keys are on your device
- Heartbeats are on public Nostr relays
- Guardians monitor Nostr directly
- Recipients recover from Nostr directly
- No EchoLock server required for any operation

### Trust Model

You must trust:
- Your device isn't compromised
- Cryptographic primitives work (AES-256, Shamir, secp256k1)
- At least 3 of your 5 guardians are honest and available

You don't need to trust:
- EchoLock
- Any single guardian
- Any single Nostr relay

---

## Troubleshooting

### "Guardian not responding"

- Guardian may have declined or not set up their daemon
- Contact them directly to confirm
- Consider replacing with a different guardian (requires new switch)

### "Check-in failed"

- Verify internet connection
- Verify your private key is correct
- Try again in a few minutes
- Check Nostr relay status

### "Can't recover message"

- Verify you have the correct switch ID
- Verify your private key matches recipient public key
- Check if 3+ guardians have released (may take time)
- Try different Nostr relays

### "Switch triggered accidentally"

- Check in immediately to prevent further releases
- Contact recipients if shares already released
- Consider longer interval for future switches

---

## Glossary

| Term | Definition |
|------|------------|
| Heartbeat | A signed message proving you're active |
| Guardian | Someone holding one piece of your key |
| Recipient | Someone who receives your message when released |
| Share | One piece of your split encryption key |
| Threshold | Time without heartbeat before release |
| Nostr | Decentralized protocol for publishing messages |
| npub | Nostr public key (starts with `npub1`) |
| nsec | Nostr private key (starts with `nsec1`) |
| NIP-44 | Nostr encryption standard |
| Shamir | Secret sharing algorithm (split key into pieces) |

---

## Getting Help

- **Documentation**: [github.com/1e9c9h9o/echolock/docs](https://github.com/1e9c9h9o/echolock/docs)
- **Issues**: [github.com/1e9c9h9o/echolock/issues](https://github.com/1e9c9h9o/echolock/issues)
- **Demo**: [echolock.xyz/demo](https://echolock.xyz/demo)

---

## Quick Reference

### Creating a Switch
1. Write message
2. Add recipient npub(s)
3. Add 5 guardian npubs
4. Set check-in interval
5. Confirm

### Checking In
- Dashboard → Click "Check In"
- Email → Click reminder link
- API → POST /api/heartbeat

### Recovering (Recipient)
1. Get switch ID
2. Go to recovery tool
3. Enter your nsec
4. Click "Recover"

### Running a Guardian
1. Clone repo and `cd guardian-daemon && npm install`
2. Generate keys: `node index.js --generate-keys`
3. Configure guardian.json with your keys
4. Run `node index.js`
