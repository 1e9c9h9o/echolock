# ECHOLOCK
⚠️ **WARNING: Experimental cryptographic software. Do not use for actual sensitive data until professional security audit completed.**

```
███████╗ ██████╗██╗  ██╗ ██████╗ ██╗      ██████╗  ██████╗██╗  ██╗
██╔════╝██╔════╝██║  ██║██╔═══██╗██║     ██╔═══██╗██╔════╝██║ ██╔╝
█████╗  ██║     ███████║██║   ██║██║     ██║   ██║██║     █████╔╝
██╔══╝  ██║     ██╔══██║██║   ██║██║     ██║   ██║██║     ██╔═██╗
███████╗╚██████╗██║  ██║╚██████╔╝███████╗╚██████╔╝╚██████╗██║  ██╗
╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
                Cryptographic Dead Man's Switch
```

## Overview
Cryptographic dead man's switch using Bitcoin timelocks and Nostr protocol for distributed secret storage.

## 🚀 Quick Start

### Watch the Demos

**Cryptographic Demo:**
```bash
npm run demo
```
See a complete 6-step demonstration of ECHOLOCK's cryptographic dead man's switch in action!

**Bitcoin Integration Demo:**
```bash
npm run bitcoin-demo
```
See Bitcoin testnet timelock integration with OP_CHECKLOCKTIMEVERIFY!

**Nostr Distribution Demo:**
```bash
npm run nostr-demo
```
See Nostr-based fragment distribution to geographically distributed relays!

### Try the Interactive CLI
```bash
npm run cli
# or
npm start
```

Available commands: `create`, `check-in`, `status`, `list`, `test-release`, `help`, `exit`

## Features

### ✅ Working (Demo Mode)
- 🔐 **AES-256-GCM Encryption** - Secure message encryption
- 🔑 **Shamir Secret Sharing** - 3-of-5 threshold key splitting
- ⏰ **Dead Man's Switch** - Automatic release on timer expiry
- 🔄 **Check-in System** - Reset timer to stay alive
- 📊 **Status Monitoring** - Real-time countdown and progress
- 🎨 **Interactive CLI** - Colorful command-line interface
- 📈 **Multiple Switches** - Manage several switches simultaneously
- ₿ **Bitcoin Timelocks** - OP_CHECKLOCKTIMEVERIFY integration with testnet
- 📡 **Blockchain Monitoring** - Live Bitcoin block height tracking
- 🌐 **Nostr Distribution** - Fragment distribution to 7+ relays with redundancy
- 🏥 **Relay Health Checking** - Exponential backoff for failed relays
- 🔄 **Automatic Fallback** - Falls back to local storage if Nostr unavailable

### ✅ Complete & Tested
- Transaction broadcasting to Bitcoin testnet with production-grade safeguards
- Comprehensive integration tests with live Nostr relays
- Exponential backoff for relay health management

### 🚧 Future Enhancements
- NIP-65 relay discovery for dynamic relay selection
- Advanced relay reputation scoring system
- Event-driven coordinator orchestration layer

## How It Works

1. **Encrypt**: Your secret message is encrypted with AES-256-GCM
2. **Split**: The encryption key is split into 5 fragments (3-of-5 threshold)
3. **Bitcoin Timelock**: Create OP_CHECKLOCKTIMEVERIFY script on Bitcoin testnet
4. **Distribute**: Fragments published to 7+ geographically distributed Nostr relays (or local storage in demo mode)
5. **Monitor**: Track both application timer and Bitcoin block height
6. **Check-in**: Reset timer to keep switch armed
7. **Release**: When timer expires, retrieve fragments from Nostr relays, reconstruct key, and decrypt message

### Nostr Distribution

When `USE_NOSTR_DISTRIBUTION=true`:
- Generates Nostr keypair for event signing
- Filters to 7+ healthy relays using exponential backoff
- Publishes each fragment as NIP-78 (application-specific data) event
- Requires minimum 5 successful publishes
- Retrieves fragments with deduplication and signature verification
- Falls back to local storage on failure

## Security Status
- [x] Cryptographic primitives implemented (AES-256-GCM, Shamir SSS)
- [x] Core dead man's switch logic complete
- [x] Local demo functional
- [x] Bitcoin timelock integrated (OP_CHECKLOCKTIMEVERIFY on testnet)
- [x] Blockchain monitoring (Blockstream API)
- [x] Nostr relay distribution implemented (7+ relay redundancy)
- [x] Relay health checking with exponential backoff
- [x] NIP-78 event format for fragments
- [x] Transaction broadcasting tested
- [x] Nostr distribution tested with live relays
- [ ] Security audit completed
- [ ] Production ready

## Installation

```bash
# Clone and install
git clone <repository-url>
cd echolock
npm install

# Run demo
npm run demo

# Run interactive CLI
npm run cli

# Run tests
npm test
```

## Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Verify setup
node scripts/verify-setup.js

# Development mode (auto-reload)
npm run dev
```

## Architecture

```
echolock/
├── src/
│   ├── crypto/          # Cryptographic operations (ISOLATED)
│   │   ├── secretSharing.js    # Shamir SSS wrapper
│   │   ├── encryption.js       # AES-256-GCM
│   │   └── keyDerivation.js    # PBKDF2
│   ├── bitcoin/         # Bitcoin timelock (testnet only)
│   ├── nostr/           # Nostr relay operations
│   │   ├── multiRelayClient.js      # WebSocket connections & fragment publishing
│   │   ├── relayHealthCheck.js      # Health monitoring with backoff
│   │   ├── websocketPolyfill.js     # Node.js WebSocket support
│   │   └── constants.js             # Relay configuration
│   ├── core/            # Dead man's switch orchestration
│   │   ├── coordinator.js
│   │   ├── config.js
│   │   └── deadManSwitch.js    # Core DMS implementation
│   └── cli/             # Command-line interface
│       ├── index.js            # Interactive CLI
│       ├── demo.js             # Automated demo
│       ├── nostrDemo.js        # Nostr distribution demo
│       └── colors.js           # Visual components
├── tests/               # Test suite
│   ├── unit/            # Unit tests (41/41 passing)
│   └── integration/     # Integration tests (Nostr)
├── security/            # Security documentation
└── data/                # Local storage (demo only)
```

## Security

This project follows security-first development:

- **Audited Libraries**: Uses `shamir-secret-sharing@0.0.4` (audited by Cure53 and Zellic)
- **Industry Standards**: `bitcoinjs-lib` for Bitcoin operations
- **Isolated Modules**: Crypto layer has no network access
- **Testnet Only**: Bitcoin operations locked to testnet until audit
- **Property-Based Testing**: 22 property tests for crypto operations
- **Comprehensive Docs**: See `/security` for threat model and known vulnerabilities

### Security Documentation
- [SECURITY.md](SECURITY.md) - Security policy & responsible disclosure
- [security/THREAT_MODEL.md](security/THREAT_MODEL.md) - Comprehensive threat analysis
- [security/AUDIT_LOG.md](security/AUDIT_LOG.md) - Audit history
- [security/VULNERABILITIES.md](security/VULNERABILITIES.md) - Known issues
- [.well-known/security.txt](.well-known/security.txt) - Security contact & reporting

### Reporting Security Issues
Found a vulnerability? Please report responsibly:
- **GitHub**: [Create Security Advisory](https://github.com/[username]/echolock/security/advisories/new)
- **Email**: security@example.com
- **Details**: See [.well-known/security.txt](.well-known/security.txt)

## Dependencies

**Production:**
- `shamir-secret-sharing@0.0.4` - Audited by Cure53 & Zellic
- `bitcoinjs-lib@6.1.7` - Bitcoin operations
- `ecpair@3.0.0` + `tiny-secp256k1@2.2.4` - Elliptic curve cryptography
- `nostr-tools@2.17.0` - Nostr protocol with WebSocket support
- `ws@8.18.3` - WebSocket client for Node.js
- `dotenv@17.2.3` - Configuration

**Development:**
- `jest@30.2.0` - Testing framework

All dependencies installed with **0 vulnerabilities**.

## Testing

```bash
npm test
```

**Test Coverage:**
- 41/41 tests passing (100%)
- Comprehensive crypto module tests
- Project structure validation
- Security boundary verification

## Example Usage

### Create a Switch
```javascript
import * as dms from './src/core/deadManSwitch.js';

// Create switch with 72-hour check-in interval
const result = await dms.createSwitch(
  "My secret message",
  72  // hours
);

console.log('Switch ID:', result.switchId);
console.log('Fragments:', result.fragmentCount);
console.log('Threshold:', result.requiredFragments);
```

### Check-in
```javascript
// Reset timer
const result = dms.checkIn(switchId);
console.log('New expiry:', new Date(result.newExpiryTime));
```

### Check Status
```javascript
const status = dms.getStatus(switchId);
console.log('Time remaining:', status.timeRemaining, 'ms');
console.log('Status:', status.status);  // ARMED, TRIGGERED, or RELEASED
```

### Release Secret
```javascript
// Reconstruct and decrypt
const result = await dms.testRelease(switchId);
console.log('Decrypted:', result.reconstructedMessage);
```

## CLI Commands

**Interactive Mode:**
```bash
$ npm run cli

echolock> help

Available Commands:
  create        Create a new dead man's switch
  check-in      Reset the timer (perform check-in)
  status        Show current status
  list          List all switches
  select <id>   Select a switch by ID
  test-release  Manually trigger release (for testing)
  delete        Delete current switch
  help          Show this help message
  exit          Quit the program
```

## Contributing

This is a security-critical project. Before contributing:

1. Read [SECURITY.md](SECURITY.md)
2. Review [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
3. Understand the threat model
4. Ensure 100% test coverage for crypto code
5. Follow security-first development practices

## License

[To be determined]

## Important Notes

⚠️ **EXPERIMENTAL SOFTWARE**
- This is a proof-of-concept implementation
- **DO NOT** use for actual sensitive data
- Professional security audit required before production
- Testnet only for Bitcoin operations
- No warranty or guarantees provided

⚠️ **CRYPTOGRAPHIC SOFTWARE**
- Mistakes can result in permanent data loss
- Mistakes can result in premature secret disclosure
- User's life or freedom may depend on correct operation
- Comprehensive testing required

⚠️ **DEVELOPMENT STATUS**
- Core functionality implemented and working ✅
- Demo mode fully functional ✅
- Bitcoin timelock integration complete ✅
- Nostr distribution system implemented ✅
- Integration testing with live relays in progress 🚧
- Production deployment not ready

## Configuration

### Environment Variables

```bash
# Enable Nostr distribution (default: false - uses local storage)
export USE_NOSTR_DISTRIBUTION=true

# Custom relay list (comma-separated)
export NOSTR_RELAYS="wss://relay.damus.io,wss://nos.lol,wss://relay.nostr.band"

# Minimum healthy relays required (default: 7)
export MIN_RELAY_COUNT=7

# Bitcoin network (locked to testnet)
export BITCOIN_NETWORK=testnet

# Check-in interval in hours (default: 72)
export CHECK_IN_HOURS=72

# Debug mode
export DEBUG=true
```

## Support

- **Setup Guide**: See [SETUP_COMPLETE.md](SETUP_COMPLETE.md)
- **CLI Demo**: See [CLI_DEMO_COMPLETE.md](CLI_DEMO_COMPLETE.md)
- **Bitcoin Integration**: See [BITCOIN_INTEGRATION.md](BITCOIN_INTEGRATION.md)
- **Nostr Implementation**: See [NOSTR_IMPLEMENTATION.md](NOSTR_IMPLEMENTATION.md)
- **Architecture**: See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Development**: See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## Acknowledgments

- **Shamir Secret Sharing**: [shamir-secret-sharing](https://github.com/privy-io/shamir-secret-sharing) by Privy
- **Security Audits**: [Cure53](https://cure53.de/) and [Zellic](https://www.zellic.io/)
- **Bitcoin**: [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib)
- **Nostr**: [nostr-tools](https://github.com/nbd-wtf/nostr-tools)

---

**Built with security-first development practices**
**Current Status**: Development - Demo Functional ✅
**Version**: 0.1.0