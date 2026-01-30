# ECHOLOCK

```
███████╗ ██████╗██╗  ██╗ ██████╗ ██╗      ██████╗  ██████╗██╗  ██╗
██╔════╝██╔════╝██║  ██║██╔═══██╗██║     ██╔═══██╗██╔════╝██║ ██╔╝
█████╗  ██║     ███████║██║   ██║██║     ██║   ██║██║     █████╔╝
██╔══╝  ██║     ██╔══██║██║   ██║██║     ██║   ██║██║     ██╔═██╗
███████╗╚██████╗██║  ██║╚██████╔╝███████╗╚██████╔╝╚██████╗██║  ██╗
╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
       Fully Decentralized Cryptographic Dead Man's Switch
```

**v1.0.0** | **AGPL-3.0** | **501 Tests Passing** | **Awaiting Security Audit**

⚠️ **AUDIT STATUS**: Core architecture complete. Professional security audit required before mainnet use with real funds.

---

## The Promise

> **If EchoLock disappears tomorrow, your switch still works.**

You control your keys. Guardians watch for your heartbeat. Bitcoin proves time. If you stop checking in, your message releases automatically — no server, no company, no trusted third party required.

See [CLAUDE.md](CLAUDE.md) for the complete architectural specification.

---

## Documentation

| Document | Description |
|----------|-------------|
| **[User Guide](docs/USER_GUIDE.md)** | How to use EchoLock (start here) |
| [Self-Hosting Guide](docs/SELF_HOSTING.md) | Run your own infrastructure |
| [Architecture](CLAUDE.md) | Complete technical specification |
| [API Reference](API_DOCS.md) | REST API documentation |

---

## Architecture (v1.0 - Fully Decentralized)

| Component | How It Works |
|-----------|--------------|
| **Keys** | Generated in your browser (WebCrypto). Never sent to any server. |
| **Timer** | Guardian Network watches Nostr for your heartbeats |
| **Storage** | Shamir shares encrypted to guardians' public keys |
| **Release** | Guardians publish shares when heartbeats stop |
| **Proof** | Bitcoin OP_CHECKLOCKTIMEVERIFY (optional, mainnet-ready) |
| **Survival** | **Works identically without EchoLock** |

See [CLAUDE.md](CLAUDE.md) for the Guardian Network architecture.

---

## Overview
Cryptographic dead man's switch using Bitcoin timelocks and Nostr protocol for distributed secret storage.

## 🚀 Quick Start

### 🌐 Production Web Application

ECHOLOCK is live in production with a full-featured web interface:

**Website:** https://www.echolock.xyz
**API:** https://echolock-api-production.up.railway.app

**Features:**
- ✨ **Mobile-Optimized** - Responsive design for all screen sizes
- 🔐 **User Authentication** - JWT-based secure login/signup
- 📊 **Real-time Dashboard** - Live switch management with WebSocket updates
- 🌓 **Dark Mode** - System preference detection
- 🌍 **Multi-language** - English, Spanish, French, Arabic (with RTL support)
- 📧 **Email Notifications** - Check-in reminders and release alerts
- 📱 **QR Code Sharing** - Easy switch sharing
- 📅 **Calendar Integration** - Add check-in reminders to your calendar

**Demo Account:**
- Email: demo@echolock.xyz
- Password: DemoPass123

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

### API Server (Production)

ECHOLOCK includes a production-ready REST API with PostgreSQL backend:

```bash
# Start API server
npm run api

# Development mode with auto-reload
npm run api:dev
```

**API Features:**
- JWT authentication with access & refresh tokens
- Multi-user support with user accounts
- PostgreSQL database storage
- Email notifications (verification, reminders, releases)
- WebSocket real-time updates
- Background jobs (auto-release, reminders)
- Rate limiting and security middleware
- Comprehensive audit logging

**API Endpoints:**
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/switches` - Create switch
- `GET /api/switches` - List switches
- `POST /api/switches/:id/checkin` - Check-in
- `GET /api/switches/:id` - Get status
- `DELETE /api/switches/:id` - Delete switch

**Documentation:**
- [API_DOCS.md](./API_DOCS.md) - Complete API reference
- [LOCAL_SETUP_GUIDE.md](./LOCAL_SETUP_GUIDE.md) - Setup instructions
- [CLI_VS_API_GUIDE.md](./CLI_VS_API_GUIDE.md) - Mode comparison

**Quick Start:**
```bash
# Set up database
npm run db:migrate

# Start API server
npm run api:dev

# Test health endpoint
curl http://localhost:3000/health
```

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
- **Full-featured dashboard UI** with 8 advanced enhancements:
  - 🌓 Dark mode with system preference detection
  - 🔌 Real-time WebSocket updates
  - 🔔 Browser push notifications
  - ⌨️ 10+ keyboard shortcuts
  - 📥 CSV/PDF export functionality
  - 🔍 Advanced filtering and search
  - ✅ Batch operations with multi-select
  - 📱 QR code generation and sharing

### ✨ NEW: Complete UX Feature Suite (Production Ready)
- **📅 Calendar Integration**
  - Add check-in reminders to Google Calendar, Outlook, Yahoo
  - Download .ics files for Apple Calendar and other apps
  - Multiple reminder times (24h, 6h, 1h before expiry)
  - One-click calendar integration

- **🎓 User Onboarding Flow**
  - Interactive welcome modal with feature overview
  - 7-step guided product tour using react-joyride
  - Progress checklist tracking 6 key milestones
  - Auto-start for new users with persistent tracking

- **♿ WCAG 2.1 AA Accessibility**
  - Full keyboard navigation with custom shortcuts
  - Comprehensive ARIA labels and screen reader support
  - Focus management in modals and dropdowns
  - Color contrast compliance (4.5:1 minimum)
  - Skip-to-content functionality

- **🌍 Multi-Language Support (i18n)**
  - 4 languages: English, Spanish, French, Arabic
  - Complete UI translations (100% coverage)
  - RTL (Right-to-Left) support for Arabic
  - Auto-detect browser language
  - Locale-aware date/time/number formatting

- **📧 Email & Real-time Notifications**
  - Email reminders at 24h, 6h, 1h before expiry
  - WebSocket real-time updates for all switch actions
  - Browser push notifications
  - Email verification and password reset flows

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
- [x] Client-side key generation (WebCrypto API)
- [x] Guardian Network protocol implemented
- [x] Nostr heartbeats (BIP-340 Schnorr signatures)
- [x] Bitcoin timelocks (OP_CHECKLOCKTIMEVERIFY, mainnet-ready)
- [x] Nostr relay distribution (7+ relay redundancy)
- [x] Autonomous release mechanism
- [x] Recipient-side reconstruction tools
- [x] Self-hosting documentation
- [x] 501 unit tests passing
- [ ] **Professional security audit** ← SEEKING AUDITORS
- [ ] Penetration testing
- [ ] Bug bounty program

## Production Deployment

### Current Infrastructure

**Frontend (Vercel):**
- Production: https://www.echolock.xyz
- Framework: Next.js 14 with App Router
- Hosting: Vercel (auto-deploys from main branch)
- Features: SSR, responsive design, dark mode, i18n

**Backend (Railway):**
- API: https://echolock-api-production.up.railway.app
- Framework: Express.js with Node.js
- Database: PostgreSQL (managed by Railway)
- Features: JWT auth, WebSocket, background jobs, email service

**Architecture:**
```
┌─────────────────┐
│  Browser/Mobile │
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────┐         ┌──────────────────┐
│  Vercel CDN     │ ───────→│  Railway API     │
│  www.echolock   │  REST   │  + PostgreSQL    │
│  .xyz           │ ←─────  │                  │
└─────────────────┘ WebSocket└──────────────────┘
         │                           │
         │                           ↓
         │                  ┌──────────────────┐
         └─────────────────→│  Nostr Relays    │
                  Fragments │  (7+ global)     │
                            └──────────────────┘
```

### Mobile-Responsive Updates (Oct 2025)

Recent improvements for mobile devices:
- ✅ Proper viewport meta tag configuration
- ✅ Responsive typography (16px mobile → 18px desktop)
- ✅ Flexible heading sizes (text-3xl → text-5xl)
- ✅ Adaptive spacing and padding
- ✅ Mobile-first grid layouts
- ✅ Touch-friendly button sizes
- ✅ Optimized for screens 320px and up

## Installation

```bash
# Clone and install
git clone https://github.com/1e9c9h9o/echolock.git
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
│   ├── api/             # RESTful API server
│   │   ├── server.js            # Express.js server
│   │   ├── routes/              # API endpoints
│   │   ├── middleware/          # Auth, validation, security
│   │   └── services/            # Business logic
│   └── cli/             # Command-line interface
│       ├── index.js            # Interactive CLI
│       ├── demo.js             # Automated demo
│       ├── nostrDemo.js        # Nostr distribution demo
│       └── colors.js           # Visual components
├── frontend/            # Next.js web application
│   ├── app/             # Next.js 14 App Router
│   │   ├── dashboard/           # Main dashboard
│   │   │   ├── page.tsx         # Switch list
│   │   │   ├── enhanced/        # Full-featured dashboard
│   │   │   ├── create/          # Switch creation
│   │   │   ├── create-wizard/   # Multi-step wizard
│   │   │   ├── demo/            # Demo mode
│   │   │   └── switches/[id]/   # Switch details
│   │   ├── auth/                # Authentication pages
│   │   └── layout.tsx           # Root layout
│   ├── components/      # React components
│   │   ├── ui/                  # Base UI components
│   │   ├── AddToCalendar.tsx    # Calendar integration ✨ NEW
│   │   ├── OnboardingTour.tsx   # Interactive tour ✨ NEW
│   │   ├── WelcomeModal.tsx     # Welcome screen ✨ NEW
│   │   ├── OnboardingChecklist.tsx  # Progress tracking ✨ NEW
│   │   ├── LanguageSwitcher.tsx # Language selection ✨ NEW
│   │   ├── CountdownTimer.tsx   # Real-time timers
│   │   ├── ProgressBar.tsx      # Visual progress
│   │   ├── SwitchFilters.tsx    # Advanced filtering
│   │   ├── BatchActions.tsx     # Bulk operations
│   │   ├── QRCodeModal.tsx      # QR code generation
│   │   └── [25+ components]
│   ├── i18n/            # Internationalization ✨ NEW
│   │   ├── config.ts            # i18n configuration
│   │   └── locales/             # Translation files (en, es, fr, ar)
│   ├── docs/            # Frontend documentation ✨ NEW
│   │   └── UX_FEATURES.md       # Complete UX guide
│   ├── contexts/        # React contexts
│   │   └── ThemeContext.tsx     # Dark mode theme
│   ├── hooks/           # Custom React hooks
│   │   └── useKeyboardShortcuts.ts
│   └── lib/             # Utilities
│       ├── api.ts               # API client
│       ├── calendar.ts          # Calendar utilities ✨ NEW
│       ├── i18n.ts              # Translation helpers ✨ NEW
│       ├── websocket.ts         # Real-time updates
│       ├── notifications.ts     # Push notifications
│       └── export.ts            # CSV/PDF export
├── tests/               # Test suite (501 tests)
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests (Nostr)
│   └── security/        # Security tests
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
- **GitHub**: [Create Security Advisory](https://github.com/1e9c9h9o/echolock/security/advisories/new)
- **Email**: echoooolock@gmail.com
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
- 501 tests passing
- Comprehensive crypto module tests
- Guardian Network protocol tests
- Bitcoin timelock tests
- Nostr integration tests
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

AGPL-3.0 - See [LICENSE](LICENSE) for details.

This project is licensed under the GNU Affero General Public License v3.0, which requires that:
- Source code must be made available when the software is used over a network
- Modifications must be released under the same license
- Changes must be documented

Perfect for ensuring community collaboration and transparency in cryptographic software.

## Important Notes

⚠️ **AWAITING SECURITY AUDIT**
- Core architecture is complete and tested (501 unit tests)
- **Professional security audit required** before mainnet use with real funds
- Bitcoin operations are mainnet-ready but use testnet until audit completes
- Contact: echoooolock@gmail.com for audit inquiries

⚠️ **CRYPTOGRAPHIC SOFTWARE**
- Mistakes can result in permanent data loss
- Mistakes can result in premature secret disclosure
- User's life or freedom may depend on correct operation
- All cryptographic code has comprehensive test coverage

⚠️ **COMPLETION STATUS**
- All 5 decentralization phases complete ✅
- Client-side key generation ✅
- Guardian Network protocol ✅
- Nostr heartbeats ✅
- Bitcoin timelocks (mainnet-ready) ✅
- Autonomous release ✅
- Blocking on: **Security audit**

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

## Frontend Features

### Enhanced Dashboard UI
The EchoLock frontend provides a modern, feature-rich interface built with Next.js 14 and Tailwind CSS:

**🎨 Design System**
- **High Performance HMI** - Industrial-grade cognitive ergonomics for situational awareness
- Muted slate palette for structure, color reserved for status alerts
- Redundant shape+color coding for accessibility (Circle/Triangle/Octagon)
- Analog gauges and sparkline trends for pattern recognition
- Responsive layouts (mobile, tablet, desktop)
- Dark mode with theme persistence

**⚡ Advanced Features**
- **Real-time Updates**: WebSocket integration for live switch status
- **Push Notifications**: Browser notifications for urgent check-ins
- **Keyboard Shortcuts**: 10+ shortcuts for power users (press `?` for help)
- **Export Functionality**: Download switches as CSV or PDF reports
- **Advanced Filtering**: Search, filter by status, sort by multiple criteria
- **Batch Operations**: Multi-select switches for bulk actions
- **QR Code Sharing**: Generate QR codes for easy sharing
- **Visual Timers**: Real-time countdown timers and progress bars

**📱 Pages & Features**
- Dashboard with switch management
- Multi-step wizard for switch creation
- Demo mode with accelerated 10-minute lifecycle
- Switch detail pages with check-in history
- User settings and account management

**🚀 Getting Started**
```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:3001
```

For detailed feature documentation, see [DASHBOARD_ENHANCEMENTS.md](DASHBOARD_ENHANCEMENTS.md)

## Support

- **Setup Guide**: See [SETUP_COMPLETE.md](SETUP_COMPLETE.md)
- **CLI Demo**: See [CLI_DEMO_COMPLETE.md](CLI_DEMO_COMPLETE.md)
- **Bitcoin Integration**: See [BITCOIN_INTEGRATION.md](BITCOIN_INTEGRATION.md)
- **Nostr Implementation**: See [NOSTR_IMPLEMENTATION.md](NOSTR_IMPLEMENTATION.md)
- **Dashboard Features**: See [DASHBOARD_ENHANCEMENTS.md](DASHBOARD_ENHANCEMENTS.md)
- **HMI Design System**: See [docs/HMI-DESIGN-SYSTEM.md](docs/HMI-DESIGN-SYSTEM.md) ✨ NEW
- **UX Features Guide**: See [frontend/docs/UX_FEATURES.md](frontend/docs/UX_FEATURES.md)
- **Implementation Summary**: See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) ✨ NEW
- **Architecture**: See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Development**: See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## Acknowledgments

- **Shamir Secret Sharing**: [shamir-secret-sharing](https://github.com/privy-io/shamir-secret-sharing) by Privy
- **Security Audits**: [Cure53](https://cure53.de/) and [Zellic](https://www.zellic.io/)
- **Bitcoin**: [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib)
- **Nostr**: [nostr-tools](https://github.com/nbd-wtf/nostr-tools)

---

**Built with security-first development practices**
**Current Status**: Core Architecture Complete - Awaiting Security Audit
**Version**: 1.0.0