# ECHOLOCK Local Development Setup Guide

This guide will help you set up the ECHOLOCK API server for local development.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Running the API Server](#running-the-api-server)
6. [Running the CLI](#running-the-cli)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **PostgreSQL** >= 14 ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/))

### Optional (for full features)

- **Bitcoin Core** (testnet) - Only if using Bitcoin timelock
- **Email Service Account** - Resend.com for email notifications

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/echolock.git
cd echolock

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env

# Set up the database
npm run db:migrate

# Start the API server
npm run api
```

The API will be available at: `http://localhost:3000/api`

---

## Database Setup

### 1. Install PostgreSQL

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**On macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**On Windows:**
Download installer from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Create Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE echolock;
CREATE USER echolock WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE echolock TO echolock;

# Exit PostgreSQL
\q
```

### 3. Run Migrations

```bash
# Set database URL in .env first
DATABASE_URL=postgresql://echolock:your-secure-password@localhost:5432/echolock

# Run schema migration
npm run db:migrate
```

### 4. Verify Database Setup

```bash
# Connect to verify tables
psql postgresql://echolock:your-secure-password@localhost:5432/echolock

# List tables
\dt

# You should see:
# - users
# - switches
# - recipients
# - check_ins
# - release_log
# - audit_log
# - relay_health

# Exit
\q
```

---

## Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Generate Secrets

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Generate Service Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Edit .env File

```bash
nano .env
```

**Minimum Required Configuration:**

```env
# Server
NODE_ENV=development
PORT=3000

# Database (update with your credentials)
DATABASE_URL=postgresql://echolock:your-password@localhost:5432/echolock

# Security (use generated secrets above)
JWT_SECRET=<paste-generated-jwt-secret>
SERVICE_ENCRYPTION_KEY=<paste-generated-encryption-key>

# Email (optional for development)
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=EchoLock <noreply@yourdomain.com>

# Nostr (enabled by default)
USE_NOSTR_DISTRIBUTION=true

# CORS (for local frontend)
CORS_ORIGINS=http://localhost:3001

# Bitcoin (disabled by default until audit)
USE_BITCOIN_TIMELOCK=false
```

### 4. Email Service Setup (Optional)

For email verification and notifications:

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from dashboard
3. Add to `.env`:
   ```env
   RESEND_API_KEY=re_your_actual_key
   FROM_EMAIL=noreply@yourdomain.com
   ```

**For Development:** You can set `MOCK_EMAIL_SERVICE=true` to log emails instead of sending.

---

## Running the API Server

### Development Mode (with auto-reload)

```bash
npm run api:dev
```

The server will restart automatically when you edit files.

### Production Mode

```bash
npm run api
```

### Verify Server is Running

```bash
# Health check
curl http://localhost:3000/health

# API info
curl http://localhost:3000/api
```

**Expected Output:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T12:00:00.000Z",
  "database": {
    "connected": true
  }
}
```

---

## Running the CLI

ECHOLOCK includes a CLI for local testing and management.

### Start CLI

```bash
npm run cli
```

### CLI Commands

```
Available commands:
  create              - Create a new dead man's switch
  check-in            - Check in to reset timer
  status              - View switch status
  list                - List all switches
  select <id>         - Select a switch by ID
  delete              - Delete current switch
  test-release        - Test message release
  help                - Show help
  exit                - Exit CLI
```

### CLI Example Session

```bash
$ npm run cli

> create
Title: Test Switch
Message: This is my secret message
Check-in hours (72): 24
Password: mypassword123
Confirm password: mypassword123

✓ Switch created successfully!
ID: abc-123-def-456

> status
Switch: Test Switch
Status: ARMED
Expires: 2025-10-28 12:00:00
Last check-in: 2025-10-27 12:00:00

> check-in
✓ Check-in successful! Timer reset.
```

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Unit Tests Only

```bash
npm run test:unit
```

### Run Integration Tests

```bash
npm run test:integration
```

### Run with Coverage

```bash
npm run test:coverage
```

### Test API Endpoints Manually

**1. Signup:**
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

**2. Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

**3. Create Switch:**
```bash
# Save access token from login
TOKEN="your-access-token"

curl -X POST http://localhost:3000/api/switches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Switch",
    "message": "Secret message",
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

---

## Troubleshooting

### Database Connection Failed

**Error:**
```
Database connection failed: ECONNREFUSED
```

**Solutions:**
1. Verify PostgreSQL is running:
   ```bash
   sudo service postgresql status
   # or on macOS:
   brew services list
   ```

2. Check DATABASE_URL in .env:
   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/echolock
   ```

3. Test connection manually:
   ```bash
   psql $DATABASE_URL
   ```

---

### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
1. Kill process on port 3000:
   ```bash
   # Find process
   lsof -i :3000

   # Kill process
   kill -9 <PID>
   ```

2. Use a different port in .env:
   ```env
   PORT=3001
   ```

---

### Email Service Not Working

**Error:**
```
Failed to send verification email
```

**Solutions:**
1. For development, use mock email:
   ```env
   MOCK_EMAIL_SERVICE=true
   ```

2. Check Resend API key is valid

3. Skip email verification in development:
   ```env
   SKIP_EMAIL_VERIFICATION=true
   ```

---

### JWT Secret Warning

**Warning:**
```
Using default JWT secret - tokens will not persist across restarts!
```

**Solution:**
Generate and set JWT_SECRET in .env:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Add to .env:
```env
JWT_SECRET=<generated-secret>
```

---

### Nostr Relay Connection Issues

**Error:**
```
Failed to publish to Nostr relays
```

**Solutions:**
1. Check internet connection

2. Disable Nostr for local testing:
   ```env
   USE_NOSTR_DISTRIBUTION=false
   ```

3. Verify relay URLs in .env

4. Check relay health:
   ```bash
   curl http://localhost:3000/api/admin/relay-health \
     -H "Authorization: Bearer $TOKEN"
   ```

---

### Database Migration Errors

**Error:**
```
relation "users" already exists
```

**Solution:**
Drop and recreate database:
```bash
sudo -u postgres psql

DROP DATABASE echolock;
CREATE DATABASE echolock;
GRANT ALL PRIVILEGES ON DATABASE echolock TO echolock;
\q

npm run db:migrate
```

---

## Development Workflow

### 1. Dual Mode Development

ECHOLOCK supports both CLI and API modes simultaneously:

**Terminal 1 - API Server:**
```bash
npm run api:dev
```

**Terminal 2 - CLI:**
```bash
npm run cli
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

### 2. Recommended VS Code Extensions

- **PostgreSQL** - Manage database
- **REST Client** - Test API endpoints
- **ES6 Modules** - JavaScript/Node.js syntax
- **Prettier** - Code formatting

### 3. Debugging

**Enable Debug Logging:**
```env
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

**VS Code Launch Configuration:**
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug API Server",
  "program": "${workspaceFolder}/src/api/server.js",
  "env": {
    "NODE_ENV": "development"
  }
}
```

### 4. Hot Reload

The API server supports hot reload in development:

```bash
npm run api:dev
```

Edit any file in `src/api/` and the server will restart automatically.

---

## Project Structure

```
echolock/
├── src/
│   ├── api/              # API server (PostgreSQL)
│   │   ├── server.js     # Express server
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth, validation
│   │   ├── db/           # Database schema
│   │   ├── jobs/         # Cron jobs
│   │   └── utils/        # Utilities
│   │
│   ├── cli/              # CLI interface (file storage)
│   │   ├── index.js      # CLI entry point
│   │   └── demo.js       # Demo scripts
│   │
│   ├── core/             # Core cryptography (shared)
│   │   └── deadManSwitch.js
│   │
│   ├── crypto/           # Crypto modules
│   │   ├── encryption.js
│   │   ├── secretSharing.js
│   │   └── keyDerivation.js
│   │
│   ├── nostr/            # Nostr integration
│   └── bitcoin/          # Bitcoin timelock
│
├── data/                 # CLI file storage
│   ├── switches.json
│   └── fragments.json
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── .env                  # Environment config
├── package.json
└── API_DOCS.md          # API documentation
```

---

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run api` | Start API server (production) |
| `npm run api:dev` | Start API with hot reload |
| `npm run cli` | Start CLI interface |
| `npm run demo` | Run demo script |
| `npm run db:migrate` | Run database migrations |
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:coverage` | Run tests with coverage |

---

## Next Steps

1. **Read API Documentation:** See [API_DOCS.md](./API_DOCS.md)
2. **Try the Demo:** Run `npm run demo`
3. **Explore the CLI:** Run `npm run cli`
4. **Build a Client:** Use the API to build your own interface
5. **Contribute:** See CONTRIBUTING.md (if available)

---

## Security Notes

### Development vs Production

**Development (localhost):**
- JWT secrets can be auto-generated
- Email verification can be skipped
- Mock email service available
- Database can use simple passwords
- CORS allows localhost origins

**Production (deployment):**
- MUST set strong JWT_SECRET
- MUST use real email service
- MUST use strong database passwords
- MUST configure proper CORS origins
- MUST use HTTPS
- MUST set NODE_ENV=production

### Never Deploy Locally

**WARNING:** The API server is designed for deployment to secure hosting platforms (Railway, Heroku, etc.), not for public exposure from your local machine.

**Do NOT:**
- Expose localhost API to the internet
- Use ngrok/similar tunneling for production
- Store production secrets in .env file
- Commit .env to Git

**Instead:**
- Deploy to Railway, Heroku, or similar
- Use environment variables in hosting platform
- Use managed PostgreSQL databases
- Enable SSL/TLS certificates

---

## Getting Help

- **Documentation:** [API_DOCS.md](./API_DOCS.md)
- **Issues:** GitHub Issues
- **Email:** support@echolock.xyz (if available)

---

## License

See [LICENSE](./LICENSE) file for details.

---

**Happy Building!** 🚀
