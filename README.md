# ECHOLOCK

Cryptographic dead man's switch. Decentralized timer, distributed storage, autonomous release.

```
v1.0.0 · AGPL-3.0 · Unaudited
```

---

## What It Does

A message is encrypted. The encryption key is split into shares using Shamir's Secret Sharing. Shares are distributed to independent guardians. A heartbeat signal must be sent periodically. When heartbeats stop, guardians release their shares. Recipients reconstruct the key and decrypt the message.

No central server is required for release.

---

## Architecture

| Layer | Function |
|-------|----------|
| Encryption | AES-256-GCM, keys generated client-side (WebCrypto) |
| Key splitting | Shamir Secret Sharing, configurable M-of-N threshold |
| Distribution | Shares encrypted to guardian public keys via NIP-44 |
| Timer | Heartbeat events published to Nostr relays |
| Proof | Bitcoin OP_CHECKLOCKTIMEVERIFY timelock (optional) |
| Release | Guardians publish shares when heartbeats cease |
| Recovery | Recipients collect shares from Nostr, reconstruct locally |

---

## Installation

```bash
git clone https://github.com/1e9c9h9o/echolock.git
cd echolock
npm install
```

---

## Usage

### CLI

```bash
npm run cli
```

Commands: `create`, `check-in`, `status`, `list`, `test-release`, `help`, `exit`

### API Server

```bash
npm run db:migrate
npm run api
```

Endpoints documented in [API_DOCS.md](API_DOCS.md).

### Web Interface

Production: https://www.echolock.xyz

```bash
cd frontend
npm install
npm run dev
```

---

## Configuration

```bash
USE_NOSTR_DISTRIBUTION=true
NOSTR_RELAYS="wss://relay.damus.io,wss://nos.lol"
MIN_RELAY_COUNT=7
BITCOIN_NETWORK=testnet
CHECK_IN_HOURS=72
```

---

## How It Works

```
User Device                    Nostr Relays                 Guardians
    │                              │                            │
    ├─ Generate keys locally       │                            │
    ├─ Encrypt message             │                            │
    ├─ Split key (Shamir)          │                            │
    ├─ Encrypt shares ─────────────┼──────────────────────────► │
    │                              │                            │
    ├─ Publish heartbeat ─────────►│                            │
    │  (repeat periodically)       │◄─── Monitor ───────────────┤
    │                              │                            │
    │  [heartbeats stop]           │                            │
    │                              │◄─── Publish shares ────────┤
    │                              │                            │
Recipients                         │                            │
    │                              │                            │
    ├─ Query shares ◄──────────────┤                            │
    ├─ Reconstruct key             │                            │
    ├─ Decrypt message             │                            │
    │                              │                            │
```

---

## Project Structure

```
echolock/
├── src/
│   ├── crypto/         AES-256-GCM, Shamir SSS, PBKDF2
│   ├── bitcoin/        OP_CHECKLOCKTIMEVERIFY scripts
│   ├── nostr/          Relay connections, NIP-78 events
│   ├── core/           Switch coordination
│   ├── api/            Express.js REST server
│   └── cli/            Interactive terminal interface
├── frontend/
│   ├── app/            Next.js 14 pages
│   ├── components/     React components
│   └── lib/            API client, utilities
├── tests/              501 tests
└── security/           Threat model, audit log
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| shamir-secret-sharing | 0.0.4 | Key splitting (audited: Cure53, Zellic) |
| bitcoinjs-lib | 6.1.7 | Bitcoin transactions |
| nostr-tools | 2.17.0 | Nostr protocol |
| ws | 8.18.3 | WebSocket client |

---

## Security

Cryptographic software. Errors may cause data loss or premature disclosure.

**Status:**
- 501 tests passing
- Professional audit pending
- Bitcoin operations restricted to testnet

**Documentation:**
- [SECURITY.md](SECURITY.md)
- [security/THREAT_MODEL.md](security/THREAT_MODEL.md)
- [security/VULNERABILITIES.md](security/VULNERABILITIES.md)

**Reporting:** https://github.com/1e9c9h9o/echolock/security/advisories/new

---

## Documentation

| Document | Content |
|----------|---------|
| [User Guide](docs/USER_GUIDE.md) | End-user instructions |
| [Self-Hosting](docs/SELF_HOSTING.md) | Infrastructure setup |
| [Architecture](CLAUDE.md) | Technical specification |
| [API Reference](API_DOCS.md) | REST endpoints |
| [Development](docs/DEVELOPMENT.md) | Contributing guidelines |

---

## License

AGPL-3.0

Source must be available for network use. Modifications inherit license.

---

## References

- [Shamir's Secret Sharing](https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing)
- [BIP-65: OP_CHECKLOCKTIMEVERIFY](https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki)
- [NIP-44: Versioned Encryption](https://github.com/nostr-protocol/nips/blob/master/44.md)
- [NIP-78: Application-specific Data](https://github.com/nostr-protocol/nips/blob/master/78.md)
