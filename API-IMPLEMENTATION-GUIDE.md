# 🚀 EchoLock API Implementation Guide

**Status**: Backend Foundation Complete ✅
**Next Steps**: Route Implementation → Testing → Deployment

---

## 📦 **What I've Built For You**

### **Core Infrastructure (Production-Ready)**

1. ✅ **Database Schema** (`src/api/db/schema.sql`)
   - User authentication with email verification
   - Switch management with encrypted messages
   - Check-in audit trail
   - Recipients management
   - Release logging
   - Relay health monitoring
   - Security audit log

2. ✅ **Database Connection** (`src/api/db/connection.js`)
   - Connection pooling for performance
   - Transaction support
   - Parameterized queries (SQL injection prevention)
   - Graceful shutdown
   - Health checks

3. ✅ **Logger** (`src/api/utils/logger.js`)
   - Structured logging with Winston
   - Different formats for dev/prod
   - Automatic sensitive data redaction
   - Log rotation
   - Request/response logging

4. ✅ **Crypto Utilities** (`src/api/utils/crypto.js`)
   - Password hashing with bcrypt
   - Service-level encryption for DB
   - Token generation
   - Timing-safe comparisons

5. ✅ **Authentication** (`src/api/middleware/auth.js`)
   - JWT token generation/verification
   - Access tokens (15 min)
   - Refresh tokens (7 days)
   - Email verification checks
   - Rate limiting

6. ✅ **Express Server** (`src/api/server.js`)
   - Security headers (Helmet)
   - CORS configuration
   - Rate limiting
   - Request logging
   - Error handling
   - Health checks
   - Graceful shutdown

---

## 🛠️ **Setup Instructions**

### **Step 1: Install Dependencies**

```bash
# API dependencies
npm install express pg bcrypt jsonwebtoken winston helmet cors express-rate-limit

# Email service
npm install resend

# Cron jobs
npm install node-cron

# Development tools
npm install --save-dev nodemon dotenv
```

### **Step 2: Create Environment File**

Create `.env` file in project root:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=echolock
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_POOL_MAX=20

# Authentication
JWT_SECRET=generate_a_long_random_string_here
JWT_EXPIRES_IN=15m

# Service Encryption
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SERVICE_MASTER_KEY=your_32_byte_hex_key_here

# Email Service (Resend.com)
RESEND_API_KEY=re_your_api_key_here

# Server Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# CORS
CORS_ORIGIN=http://localhost:3001

# Frontend URL (for email links)
FRONTEND_URL=http://www.echolock.xyz
```

### **Step 3: Set Up Database**

```bash
# Install PostgreSQL (if not already installed)
# macOS:
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian:
sudo apt-get install postgresql-14

# Windows: Download from postgresql.org

# Create database
createdb echolock

# Run schema
psql -d echolock -f src/api/db/schema.sql
```

### **Step 4: Generate Secrets**

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate service master key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add these to your `.env` file.

### **Step 5: Sign Up for Resend (Email Service)**

1. Go to https://resend.com/signup
2. Sign up (free tier: 100 emails/day, 3,000/month)
3. Verify your domain (echolock.xyz)
4. Get API key
5. Add to `.env`

---

## 📋 **Next Steps: What YOU Need to Build**

I've built the **foundation**. Here's what's left (I can help with these too):

### **Phase 1: Route Handlers** (2-3 days)

#### **A. Auth Routes** (`src/api/routes/auth.js`)

```javascript
POST /api/auth/signup
- Input: { email, password }
- Action: Create user, send verification email
- Output: { message: "Check your email" }

POST /api/auth/login
- Input: { email, password }
- Action: Verify credentials, generate tokens
- Output: { accessToken, refreshToken, user }

POST /api/auth/refresh
- Input: { refreshToken }
- Action: Generate new access token
- Output: { accessToken }

POST /api/auth/verify-email
- Input: { token }
- Action: Mark email as verified
- Output: { message: "Email verified" }

POST /api/auth/forgot-password
- Input: { email }
- Action: Send password reset email
- Output: { message: "Check your email" }

POST /api/auth/reset-password
- Input: { token, newPassword }
- Action: Reset password
- Output: { message: "Password reset" }
```

#### **B. Switch Routes** (`src/api/routes/switches.js`)

```javascript
POST /api/switches
- Auth: Required
- Input: { title, message, checkInHours, password, recipients[] }
- Action: Create switch using your crypto code
- Output: { switchId, expiryTime, ... }

GET /api/switches
- Auth: Required
- Action: List user's switches
- Output: { switches: [...] }

GET /api/switches/:id
- Auth: Required
- Action: Get switch details
- Output: { switch: {...}, status, timeRemaining }

POST /api/switches/:id/checkin
- Auth: Required
- Action: Reset timer, log check-in
- Output: { newExpiryTime, message }

PATCH /api/switches/:id
- Auth: Required
- Input: { title, status }
- Action: Update switch
- Output: { switch: {...} }

DELETE /api/switches/:id
- Auth: Required
- Action: Cancel switch
- Output: { message: "Switch cancelled" }
```

#### **C. User Routes** (`src/api/routes/users.js`)

```javascript
GET /api/users/me
- Auth: Required
- Action: Get current user profile
- Output: { user: {...}, switches: [] }

PATCH /api/users/me
- Auth: Required
- Input: { email, currentPassword, newPassword }
- Action: Update user profile
- Output: { user: {...} }

DELETE /api/users/me
- Auth: Required
- Action: Delete account and all switches
- Output: { message: "Account deleted" }
```

### **Phase 2: Timer Monitor** (1 day)

```javascript
// src/api/jobs/timerMonitor.js

import cron from 'node-cron';

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  // 1. Find expired switches
  // 2. Retrieve fragments from Nostr
  // 3. Reconstruct message
  // 4. Send emails to recipients
  // 5. Update switch status
  // 6. Log release
});
```

### **Phase 3: Email Service** (1 day)

```javascript
// src/api/services/emailService.js

export async function sendVerificationEmail(email, token) {
  // Send email with verification link
}

export async function sendSwitchReleaseEmail(email, message, switchTitle) {
  // Send the dead man's switch message
}

export async function sendPasswordResetEmail(email, token) {
  // Send password reset link
}
```

---

## 🎯 **Integration With Your Existing Crypto Code**

Your existing crypto code is **perfect** - we'll use it directly:

```javascript
// src/api/services/switchService.js
import { createSwitch as createSwitchCore } from '../../core/deadManSwitch.js';
import { testRelease } from '../../core/deadManSwitch.js';

export async function createSwitch(userId, data) {
  // 1. Call your existing createSwitch()
  const result = await createSwitchCore(
    data.message,
    data.checkInHours,
    false, // No Bitcoin for MVP
    data.password
  );

  // 2. Store in database
  await db.query(
    `INSERT INTO switches (
      user_id, id, title, encrypted_message_ciphertext,
      nostr_public_key, ...
    ) VALUES ($1, $2, $3, $4, $5, ...)`,
    [userId, result.switchId, data.title, ...]
  );

  return result;
}
```

**Your crypto code stays exactly as-is!** We're just wrapping it with API/database layer.

---

## 🚀 **Running The API**

### **Development Mode**

```bash
# Start with auto-reload
npm run dev

# API will be available at:
# http://localhost:3000/api
# http://localhost:3000/health
```

### **Production Mode**

```bash
# Build (if needed)
npm run build

# Start production server
npm start
```

### **Testing**

```bash
# Test with curl
curl http://localhost:3000/health

# Test signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'
```

---

## 📁 **Project Structure**

```
echolock/
├── src/
│   ├── api/                    ← NEW API CODE
│   │   ├── server.js          ✅ Express server
│   │   ├── db/
│   │   │   ├── schema.sql     ✅ Database schema
│   │   │   └── connection.js  ✅ DB connection pool
│   │   ├── routes/
│   │   │   ├── auth.js        ⏭️ TODO
│   │   │   ├── switches.js    ⏭️ TODO
│   │   │   └── users.js       ⏭️ TODO
│   │   ├── services/
│   │   │   ├── switchService.js    ⏭️ TODO
│   │   │   └── emailService.js     ⏭️ TODO
│   │   ├── jobs/
│   │   │   └── timerMonitor.js     ⏭️ TODO
│   │   ├── middleware/
│   │   │   ├── auth.js        ✅ JWT auth
│   │   │   └── validate.js    ⏭️ TODO
│   │   └── utils/
│   │       ├── logger.js      ✅ Winston logger
│   │       └── crypto.js      ✅ Crypto utilities
│   ├── core/                   ← YOUR EXISTING CRYPTO
│   │   ├── deadManSwitch.js   ✅ Keep as-is
│   │   └── config.js          ✅ Keep as-is
│   ├── crypto/                 ← YOUR EXISTING CRYPTO
│   │   ├── encryption.js      ✅ Keep as-is
│   │   ├── secretSharing.js   ✅ Keep as-is
│   │   └── keyDerivation.js   ✅ Keep as-is
│   └── nostr/                  ← YOUR EXISTING NOSTR
│       ├── multiRelayClient.js     ✅ Keep as-is
│       ├── fragmentFormat.js       ✅ Keep as-is
│       └── relayHealthCheck.js     ✅ Keep as-is
├── .env                        ⏭️ TODO (you create)
├── package.json                ⏭️ TODO (update deps)
└── README.md
```

---

## 🔒 **Security Checklist**

### ✅ **Already Implemented**

- ✅ Password hashing (bcrypt)
- ✅ JWT authentication
- ✅ Service-level encryption
- ✅ SQL injection prevention (parameterized queries)
- ✅ Rate limiting
- ✅ Security headers (Helmet)
- ✅ CORS protection
- ✅ Sensitive data redaction in logs
- ✅ Graceful error handling

### ⏭️ **Still Needed**

- ⏭️ Input validation (use `joi` or `zod`)
- ⏭️ HTTPS certificate (Let's Encrypt)
- ⏭️ Email verification enforcement
- ⏭️ Account lockout after failed logins
- ⏭️ CSRF protection (if using cookies)
- ⏭️ Content Security Policy
- ⏭️ Regular dependency updates

---

## 💰 **Cost Breakdown** (Monthly)

- **Hosting**: Railway/Render: $5-7
- **Database**: Included with hosting
- **Email**: Resend free tier: $0 (up to 3,000 emails/month)
- **Domain**: Already owned
- **SSL**: Let's Encrypt: $0

**Total: ~$7/month** for full production MVP

---

## 🎯 **What Do You Want Me to Build Next?**

I can create any of these for you:

**Option A: Auth Routes** (signup, login, password reset)
**Option B: Switch Routes** (create, list, check-in, delete)
**Option C: Timer Monitor** (cron job to check expired switches)
**Option D: Email Service** (send verification, release messages)
**Option E: Input Validation** (validate all API inputs)
**Option F: Complete Package** (all of the above)

**Or:** Would you like me to create a **step-by-step tutorial** showing you how to build one route so you can learn the pattern and build the rest?

---

## 📚 **Learning Resources** (If You Want to DIY)

- **Express.js**: https://expressjs.com/en/guide/routing.html
- **PostgreSQL with Node**: https://node-postgres.com/
- **JWT Auth**: https://jwt.io/introduction
- **Resend Email API**: https://resend.com/docs/send-with-nodejs

---

## ❓ **Questions?**

**Let me know:**
1. Do you want me to build the routes for you? (I can do it quickly)
2. Do you want a tutorial so you can learn?
3. Do you have questions about any of the code I created?
4. Ready to deploy and test what we have so far?

**I'm here to help!** 🚀
