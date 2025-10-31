# CLI vs API Mode Guide

ECHOLOCK can run in two modes: **CLI mode** (file-based storage) and **API mode** (PostgreSQL with REST endpoints). This guide explains the differences and when to use each.

---

## Quick Comparison

| Feature | CLI Mode | API Mode |
|---------|----------|----------|
| **Storage** | JSON files (`data/`) | PostgreSQL database |
| **Interface** | Interactive terminal | REST API + Web UI |
| **Authentication** | None (local only) | JWT tokens |
| **Multi-user** | ❌ Single user | ✅ Multiple users |
| **Email Notifications** | ❌ No | ✅ Yes |
| **Background Jobs** | ❌ Manual checks | ✅ Auto-release cron |
| **Real-time Updates** | ❌ No | ✅ WebSocket |
| **Access** | Local machine only | Network accessible |
| **Best For** | Development, testing, demos | Production, web apps |

---

## CLI Mode

### When to Use

- **Local development and testing**
- **Quick demos and experiments**
- **Personal use on single machine**
- **Learning how ECHOLOCK works**
- **Offline operation**

### How to Start

```bash
npm run cli
```

### Storage Location

```
data/
├── switches.json      # Switch metadata
└── fragments.json     # Secret fragments (local mode)
```

### Example Session

```bash
$ npm run cli

EchoLock CLI v0.1.0
Type 'help' for commands

> create
Title: My First Switch
Message: This is a secret message
Check-in hours (72): 24
Password: mypassword123
Confirm password: mypassword123

✓ Switch created!
ID: abc-123-def-456
Status: ARMED
Expires: 2025-10-28 12:00:00

> list
┌─────────────────────────────────────────┐
│ Your Dead Man's Switches                │
├─────────────────────────────────────────┤
│ 1. My First Switch                      │
│    Status: ARMED                        │
│    Expires: 2025-10-28 12:00:00        │
│    Check-ins: 0                         │
└─────────────────────────────────────────┘

> check-in
✓ Check-in successful!
Timer reset. New expiry: 2025-10-29 12:00:00

> status
Switch: My First Switch
ID: abc-123-def-456
Status: ARMED
Created: 2025-10-27 12:00:00
Expires: 2025-10-29 12:00:00
Last check-in: 2025-10-28 12:00:00
Check-in count: 1
Check-in interval: 24 hours

Cryptographic Details:
- Encryption: AES-256-GCM
- Secret sharing: 3-of-5 Shamir
- Fragments: 5 (need 3 to decrypt)
- Distribution: Nostr relays (7)

> exit
Goodbye!
```

### CLI Commands Reference

| Command | Description |
|---------|-------------|
| `create` | Create new switch (interactive) |
| `check-in` | Reset timer for current switch |
| `status` | View current switch details |
| `list` | List all switches |
| `select <id>` | Select switch by ID |
| `delete` | Delete current switch |
| `test-release` | Test message release (dry run) |
| `show-bitcoin-tx` | View Bitcoin timelock details |
| `help` | Show help |
| `exit` | Exit CLI |

### Limitations

- ❌ No email notifications
- ❌ No automatic timer checks
- ❌ No multi-user support
- ❌ No web interface
- ❌ No audit logging
- ❌ No remote access

---

## API Mode

### When to Use

- **Production deployments**
- **Multi-user applications**
- **Web interfaces**
- **Mobile apps**
- **Automated monitoring**
- **Business/commercial use**

### How to Start

```bash
# Development mode (auto-reload)
npm run api:dev

# Production mode
npm run api
```

**API URL:** `http://localhost:3000/api`

### Database Schema

```sql
-- Users table
users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  password_hash VARCHAR,
  email_verified BOOLEAN,
  ...
)

-- Switches table
switches (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR,
  status VARCHAR,
  expires_at TIMESTAMP,
  encrypted_message JSONB,
  ...
)

-- Check-ins table
check_ins (
  id UUID PRIMARY KEY,
  switch_id UUID REFERENCES switches(id),
  timestamp TIMESTAMP,
  ip_address VARCHAR,
  ...
)

-- Release log
release_log (
  id UUID PRIMARY KEY,
  switch_id UUID REFERENCES switches(id),
  released_at TIMESTAMP,
  ...
)

-- Audit log
audit_log (
  id UUID PRIMARY KEY,
  user_id UUID,
  event_type VARCHAR,
  event_data JSONB,
  ...
)
```

### Example API Usage

**1. Sign Up:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**2. Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# Save the access token from response
```

**3. Create Switch:**
```bash
TOKEN="your-access-token"

curl -X POST http://localhost:3000/api/switches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Emergency Access",
    "message": "My secret message",
    "checkInHours": 72,
    "password": "encryption-password",
    "recipients": [
      {
        "email": "recipient@example.com",
        "name": "John Doe"
      }
    ]
  }'
```

**4. List Switches:**
```bash
curl http://localhost:3000/api/switches \
  -H "Authorization: Bearer $TOKEN"
```

**5. Check-In:**
```bash
curl -X POST http://localhost:3000/api/switches/<switch-id>/checkin \
  -H "Authorization: Bearer $TOKEN"
```

**6. Get Switch Status:**
```bash
curl http://localhost:3000/api/switches/<switch-id> \
  -H "Authorization: Bearer $TOKEN"
```

**7. Delete Switch:**
```bash
curl -X DELETE http://localhost:3000/api/switches/<switch-id> \
  -H "Authorization: Bearer $TOKEN"
```

### Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Email Verification** - Verify user emails
- ✅ **Email Notifications** - Auto-send on release
- ✅ **Background Jobs** - Auto-check expired switches
- ✅ **WebSocket Updates** - Real-time notifications
- ✅ **Rate Limiting** - Prevent abuse
- ✅ **Audit Logging** - Track all events
- ✅ **Multi-user** - Support many users
- ✅ **Password Reset** - Email-based recovery
- ✅ **CORS** - Web app integration

---

## Architecture Comparison

### CLI Mode Architecture

```
User
  ↓
CLI (index.js)
  ↓
deadManSwitch.js (core crypto)
  ↓
File System (data/*.json)
  ↓
Nostr Relays (optional)
```

**Data Flow:**
1. User runs CLI command
2. CLI calls core crypto functions
3. Core crypto encrypts/splits secrets
4. Saves to JSON files
5. Optionally publishes to Nostr

**Pros:**
- Simple setup
- No database needed
- Portable (just copy data/ folder)
- Great for learning

**Cons:**
- Single user only
- Manual timer checks
- No email notifications
- No remote access

---

### API Mode Architecture

```
Client (Web/Mobile)
  ↓
Express API Server
  ↓
switchService.js (wraps core crypto)
  ↓
deadManSwitch.js (core crypto)
  ↓
PostgreSQL Database
  ↓
Nostr Relays (optional)

Background Jobs:
- Timer Monitor (every 5 min)
- Reminder Monitor (every hour)
```

**Data Flow:**
1. Client sends HTTP request
2. API validates JWT token
3. Service layer calls core crypto
4. Core crypto encrypts/splits secrets
5. Service saves to PostgreSQL
6. Background job monitors expiry
7. Auto-sends emails on release

**Pros:**
- Multi-user support
- Automatic monitoring
- Email notifications
- Web/mobile compatible
- Production-ready

**Cons:**
- Requires PostgreSQL
- More complex setup
- Needs hosting platform

---

## Migration Guide

### From CLI to API

If you've been using CLI mode and want to migrate to API:

**Option 1: Manual Migration**

1. Start API server
2. Create user account via API
3. For each CLI switch:
   - Note down: title, message, checkInHours
   - Create equivalent switch via API
   - Delete old CLI switch

**Option 2: Import Script**

```javascript
// migrate-cli-to-api.js
import fs from 'fs';
import fetch from 'node-fetch';

const switches = JSON.parse(fs.readFileSync('data/switches.json'));
const API_URL = 'http://localhost:3000/api';
const TOKEN = 'your-access-token';

for (const switchData of Object.values(switches)) {
  // Note: You'll need the original password to re-encrypt
  await fetch(`${API_URL}/switches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      title: switchData.title || 'Migrated Switch',
      message: switchData.encryptedMessage, // May need decryption
      checkInHours: switchData.checkInHours,
      password: 'need-original-password',
      recipients: switchData.recipients || []
    })
  });
}
```

**Important:** You cannot directly copy encrypted data because:
- API uses different encryption (service-level)
- Need original password to decrypt CLI message
- Need to re-encrypt for API storage

---

## Shared Components

Both modes use the **same core cryptography**:

### Core Modules (Used by Both)

```
src/core/deadManSwitch.js    - Main switch logic
src/crypto/encryption.js     - AES-256-GCM
src/crypto/secretSharing.js  - Shamir SSS
src/crypto/keyDerivation.js  - PBKDF2
src/nostr/                   - Nostr integration
src/bitcoin/                 - Bitcoin timelock
```

**This means:**
- Same security guarantees
- Same encryption strength
- Same secret sharing
- Same Nostr distribution
- Same Bitcoin timelock

**Only difference:**
- CLI stores metadata in JSON
- API stores metadata in PostgreSQL

---

## Which Mode Should You Use?

### Use CLI Mode If:

- ✅ You're learning ECHOLOCK
- ✅ Testing locally
- ✅ Personal use only
- ✅ Don't need email notifications
- ✅ Want simplicity
- ✅ No database available

### Use API Mode If:

- ✅ Building a web app
- ✅ Need multiple users
- ✅ Want email notifications
- ✅ Need automatic monitoring
- ✅ Deploying to production
- ✅ Building mobile app
- ✅ Need audit logging

---

## Running Both Modes Simultaneously

You can run both modes at the same time for testing:

**Terminal 1:**
```bash
npm run api:dev
```

**Terminal 2:**
```bash
npm run cli
```

They use **separate storage**:
- CLI: `data/*.json`
- API: PostgreSQL database

So they won't interfere with each other.

---

## Environment Variables

### CLI Mode Only

```env
# Nostr configuration
USE_NOSTR_DISTRIBUTION=true
NOSTR_RELAYS=wss://relay.damus.io,...

# Bitcoin configuration
USE_BITCOIN_TIMELOCK=false
```

### API Mode Only

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/echolock

# Authentication
JWT_SECRET=your-secret
SERVICE_ENCRYPTION_KEY=your-key

# Email
RESEND_API_KEY=re_your_key
FROM_EMAIL=noreply@yourdomain.com

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:3001
```

### Shared

```env
# Feature flags (used by both)
USE_NOSTR_DISTRIBUTION=true
USE_BITCOIN_TIMELOCK=false
```

---

## Summary

| Aspect | CLI Mode | API Mode |
|--------|----------|----------|
| **Command** | `npm run cli` | `npm run api` |
| **Storage** | `data/*.json` | PostgreSQL |
| **Users** | Single | Multiple |
| **Access** | Terminal | HTTP REST API |
| **Auth** | None | JWT tokens |
| **Email** | No | Yes |
| **Auto-monitoring** | No | Yes (cron jobs) |
| **WebSocket** | No | Yes |
| **Audit Log** | No | Yes |
| **Best For** | Development | Production |

---

**Both modes are fully supported and use the same battle-tested cryptography!**

Choose based on your use case. 🔐
