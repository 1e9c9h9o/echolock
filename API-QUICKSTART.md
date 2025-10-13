# EchoLock API - Quick Start Guide

Get the EchoLock backend API running in 5 minutes.

## What You Built

A complete production-ready REST API with:
- User authentication (JWT + bcrypt)
- Dead man's switch management
- Automatic timer monitoring (cron job)
- Email notifications (Resend)
- PostgreSQL database
- Security best practices (rate limiting, CORS, helmet)

## Prerequisites

1. Node.js 18+ installed
2. PostgreSQL database (local or cloud)
3. Resend.com API key (free tier)

---

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

Edit `.env` - **minimum required**:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/echolock

# Security (generate random keys)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
SERVICE_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Email
RESEND_API_KEY=re_your_key_here
FROM_EMAIL=EchoLock <noreply@yourdomain.com>

# Frontend
FRONTEND_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3001
```

### 3. Setup Database

**Option A: Docker (Easiest)**

```bash
docker run --name echolock-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=echolock \
  -p 5432:5432 \
  -d postgres:14
```

**Option B: Local PostgreSQL**

```bash
psql -U postgres
CREATE DATABASE echolock;
\q
```

### 4. Run Migrations

```bash
npm run db:migrate
```

### 5. Start Server

```bash
npm run api:dev
```

Server running at: http://localhost:3000/api

---

## ✅ Test It Works

### Health Check

```bash
curl http://localhost:3000/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### Create User

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

Copy the `accessToken` from the response.

### Create Switch

```bash
curl -X POST http://localhost:3000/api/switches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "My First Switch",
    "message": "This is my secret message",
    "checkInHours": 72,
    "password": "encryption-password",
    "recipients": [
      {
        "email": "recipient@example.com",
        "name": "Test Recipient"
      }
    ]
  }'
```

Success! You now have a working API.

---

## 📁 Project Structure

```
src/api/
├── server.js                 # Main Express app
├── db/
│   ├── connection.js        # PostgreSQL connection pool
│   └── schema.sql           # Database schema
├── routes/
│   ├── auth.js             # Authentication endpoints
│   ├── switches.js         # Switch management
│   └── users.js            # User profile
├── services/
│   ├── switchService.js    # Switch business logic
│   └── emailService.js     # Email sending
├── middleware/
│   ├── auth.js             # JWT authentication
│   └── validate.js         # Input validation
├── utils/
│   ├── logger.js           # Winston logging
│   └── crypto.js           # Encryption utilities
└── jobs/
    └── timerMonitor.js     # Cron job for expired switches
```

---

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Switches

- `POST /api/switches` - Create new switch
- `GET /api/switches` - List user's switches
- `GET /api/switches/:id` - Get switch details
- `POST /api/switches/:id/checkin` - Check-in to reset timer
- `PATCH /api/switches/:id` - Update switch
- `DELETE /api/switches/:id` - Cancel switch
- `GET /api/switches/:id/check-ins` - Check-in history

### Users

- `GET /api/users/me` - Get profile
- `PATCH /api/users/me` - Update profile/password
- `DELETE /api/users/me` - Delete account

---

## 🎯 Next Steps

### For Development

1. **Build Frontend**: React/Next.js app that consumes this API
2. **Add Tests**: Write integration tests for endpoints
3. **API Documentation**: Add Swagger/OpenAPI docs
4. **WebSocket Support**: Real-time updates for switches

### For Production

1. **Deploy API**: Follow [API-DEPLOYMENT-GUIDE.md](./API-DEPLOYMENT-GUIDE.md)
2. **Setup Monitoring**: Sentry, LogTail, UptimeRobot
3. **Custom Domain**: Configure echolock.xyz
4. **SSL Certificate**: Let's Encrypt (automatic on most hosts)
5. **Backup Strategy**: Automated database backups

---

## 🛠️ Development Commands

```bash
# Start API (with hot reload)
npm run api:dev

# Start API (production mode)
npm run api

# Run database migrations
npm run db:migrate

# Run tests
npm test

# Run CLI (existing crypto code)
npm run cli

# Test Nostr distribution
npm run nostr-demo
```

---

## 🔒 Security Features

✅ Password hashing (bcrypt, 12 rounds)
✅ JWT authentication (access + refresh tokens)
✅ Rate limiting (general + auth-specific)
✅ Input validation (all endpoints)
✅ SQL injection prevention (parameterized queries)
✅ CORS protection
✅ Security headers (Helmet)
✅ Sensitive data redaction in logs
✅ Service-level encryption for DB

---

## 📊 Background Jobs

The API includes a **timer monitor** that runs every 5 minutes:

1. Checks for expired switches (status = ARMED, expires_at < NOW())
2. Retrieves fragments from Nostr
3. Reconstructs secret message
4. Sends emails to all recipients
5. Updates switch status to RELEASED
6. Logs everything for audit

Check logs for activity:
```bash
npm run api:dev | grep "Timer monitor"
```

---

## 🐛 Troubleshooting

### Database connection failed

```bash
# Test connection manually
psql $DATABASE_URL -c "SELECT 1"

# Check environment variable
echo $DATABASE_URL
```

### Port already in use

```bash
# Change port in .env
PORT=3001

# Or kill existing process
lsof -ti:3000 | xargs kill
```

### Email not sending

1. Check Resend API key
2. Verify domain in Resend dashboard
3. Check server logs: `npm run api:dev | grep "Email"`

### Module not found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 💰 Estimated Costs

### Development (Free)
- Local PostgreSQL
- Resend free tier (100 emails/day)

### Production Minimum (~$10/month)
- Railway PostgreSQL: $5/month
- Railway hosting: $5/month
- Resend free tier: $0 (upgrade at scale)
- Domain: $12/year

### Production Scale (~$50/month at 1000 users)
- Railway: $20/month
- Resend Pro: $20/month
- Monitoring: $10/month

---

## 📚 Documentation

- **[API-DEPLOYMENT-GUIDE.md](./API-DEPLOYMENT-GUIDE.md)** - Complete deployment guide
- **[API-IMPLEMENTATION-GUIDE.md](./API-IMPLEMENTATION-GUIDE.md)** - Architecture details
- **[BACKEND-STATUS.md](./BACKEND-STATUS.md)** - Implementation status

---

## 🤝 Support

Having issues? Check:

1. Server logs: `npm run api:dev`
2. Database logs: `docker logs echolock-db`
3. Environment variables: `cat .env`
4. Health endpoint: `curl http://localhost:3000/health`

---

## ✨ What's Working

✅ User authentication (signup, login, JWT)
✅ Email verification
✅ Password reset
✅ Switch creation (with Nostr distribution)
✅ Switch management (list, get, update, delete)
✅ Check-in system
✅ Timer monitoring (automatic release)
✅ Email notifications
✅ Audit logging
✅ Rate limiting
✅ Security hardening

---

**You're all set!** The backend is complete. Now build the frontend to create the full SaaS application.

For production deployment, see: [API-DEPLOYMENT-GUIDE.md](./API-DEPLOYMENT-GUIDE.md)
