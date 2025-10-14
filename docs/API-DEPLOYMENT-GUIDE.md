# EchoLock API Deployment Guide

Complete guide for deploying the EchoLock backend API to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Production Deployment](#production-deployment)
6. [Testing the API](#testing-the-api)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

1. **PostgreSQL Database** (v14+)
   - Option 1: [Railway.app](https://railway.app) - Free tier with PostgreSQL
   - Option 2: [Supabase](https://supabase.com) - Free tier with 500MB
   - Option 3: [Neon](https://neon.tech) - Serverless PostgreSQL

2. **Email Service** (Resend.com)
   - Sign up at [resend.com](https://resend.com)
   - Free tier: 100 emails/day, 3,000 emails/month
   - Verify your domain for production

3. **Node.js** (v18+)
   - Check: `node --version`

### Recommended Hosting

- **Railway.app** (Easiest) - $5/month + usage
- **Render.com** - Free tier available
- **Fly.io** - Free tier available
- **DigitalOcean App Platform** - $5/month

---

## Local Development Setup

### 1. Install Dependencies

```bash
npm install
```

This installs all required packages:
- Express.js (API framework)
- PostgreSQL client (pg)
- bcrypt (password hashing)
- jsonwebtoken (JWT auth)
- winston (logging)
- helmet (security headers)
- resend (email service)
- node-cron (timer monitor)

### 2. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values (see [Environment Configuration](#environment-configuration) below).

### 3. Setup Local Database

**Option A: Docker PostgreSQL**

```bash
docker run --name echolock-db \
  -e POSTGRES_PASSWORD=your-password \
  -e POSTGRES_DB=echolock \
  -p 5432:5432 \
  -d postgres:14
```

**Option B: Native PostgreSQL**

```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database
psql -U postgres
CREATE DATABASE echolock;
CREATE USER echolock WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE echolock TO echolock;
\q
```

### 4. Run Database Migrations

```bash
npm run db:migrate
```

This creates all necessary tables:
- users
- switches
- recipients
- check_ins
- release_log
- audit_log
- api_keys
- relay_health

### 5. Start Development Server

```bash
npm run api:dev
```

API will be available at `http://localhost:3000/api`

---

## Database Setup

### Production Database Options

#### Railway.app (Recommended)

1. Go to [railway.app](https://railway.app)
2. Create new project → Add PostgreSQL
3. Copy the `DATABASE_URL` from the database settings
4. Add to your `.env` file

```bash
# Railway provides this format:
DATABASE_URL=postgresql://postgres:password@host.railway.app:5432/railway
```

#### Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database
4. Copy "Connection string" (Transaction mode)
5. Add to your `.env` file

```bash
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres
```

#### Neon

1. Go to [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Add to your `.env` file

```bash
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb
```

### Run Migrations on Production

After setting up your production database:

```bash
# Set production DATABASE_URL in .env
DATABASE_URL=your-production-url npm run db:migrate
```

Or manually:

```bash
psql $DATABASE_URL -f src/api/db/schema.sql
```

---

## Environment Configuration

### Required Environment Variables

Create a `.env` file with these values:

```bash
# ============================================
# SERVER
# ============================================
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://echolock.xyz

# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://user:password@host:5432/database

# ============================================
# AUTHENTICATION
# ============================================
# Generate these with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-random-jwt-secret-64-chars-minimum
SERVICE_ENCRYPTION_KEY=your-random-encryption-key-32-bytes

# ============================================
# EMAIL (Resend.com)
# ============================================
RESEND_API_KEY=re_your_api_key
FROM_EMAIL=EchoLock <noreply@echolock.xyz>

# ============================================
# NOSTR
# ============================================
NOSTR_RELAYS=wss://relay.damus.io,wss://nos.lol,wss://relay.nostr.band

# ============================================
# CORS
# ============================================
CORS_ORIGINS=https://echolock.xyz,https://www.echolock.xyz
```

### Generating Secure Keys

**JWT Secret** (minimum 64 characters):
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Service Encryption Key** (32 bytes):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Email Setup (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain:
   - Go to Domains → Add Domain
   - Add DNS records (MX, TXT for SPF, TXT for DKIM)
   - Wait for verification (usually 5-10 minutes)
3. Create API key:
   - Go to API Keys → Create API Key
   - Copy the key (starts with `re_`)
4. Update `.env`:
   ```bash
   RESEND_API_KEY=re_abc123...
   FROM_EMAIL=EchoLock <noreply@yourdomain.com>
   ```

---

## Production Deployment

### Option 1: Railway.app (Recommended)

**Step 1: Create Railway Project**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init
```

**Step 2: Add PostgreSQL**

```bash
railway add postgresql
```

**Step 3: Set Environment Variables**

```bash
# Set all required environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your-secret
railway variables set SERVICE_ENCRYPTION_KEY=your-key
railway variables set RESEND_API_KEY=re_xxx
railway variables set FROM_EMAIL="EchoLock <noreply@echolock.xyz>"
railway variables set FRONTEND_URL=https://echolock.xyz
railway variables set CORS_ORIGINS=https://echolock.xyz
```

**Step 4: Deploy**

```bash
railway up
```

**Step 5: Run Migrations**

```bash
railway run npm run db:migrate
```

**Step 6: Generate Domain**

Go to Railway dashboard → Settings → Generate Domain

Your API will be available at: `https://your-project.up.railway.app/api`

### Option 2: Render.com

**Step 1: Create Web Service**

1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect your GitHub repository
4. Configure:
   - **Name**: echolock-api
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm run api`

**Step 2: Add PostgreSQL**

1. New → PostgreSQL
2. Copy "Internal Database URL"

**Step 3: Environment Variables**

Add in Render dashboard → Environment:

```
NODE_ENV=production
DATABASE_URL=<your-postgres-url>
JWT_SECRET=<generate-secure-key>
SERVICE_ENCRYPTION_KEY=<generate-secure-key>
RESEND_API_KEY=re_xxx
FROM_EMAIL=EchoLock <noreply@echolock.xyz>
FRONTEND_URL=https://echolock.xyz
CORS_ORIGINS=https://echolock.xyz
```

**Step 4: Deploy**

Render will auto-deploy on git push.

**Step 5: Run Migrations**

Shell → `npm run db:migrate`

### Option 3: Fly.io

**Step 1: Install Fly CLI**

```bash
curl -L https://fly.io/install.sh | sh
```

**Step 2: Launch App**

```bash
fly launch
```

**Step 3: Create PostgreSQL**

```bash
fly postgres create
fly postgres attach <postgres-app-name>
```

**Step 4: Set Secrets**

```bash
fly secrets set JWT_SECRET=your-secret
fly secrets set SERVICE_ENCRYPTION_KEY=your-key
fly secrets set RESEND_API_KEY=re_xxx
fly secrets set FROM_EMAIL="EchoLock <noreply@echolock.xyz>"
fly secrets set FRONTEND_URL=https://echolock.xyz
```

**Step 5: Deploy**

```bash
fly deploy
```

---

## Testing the API

### Health Check

```bash
curl https://your-api-url.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-12T...",
  "uptime": 123.45,
  "environment": "production",
  "database": "connected"
}
```

### Test Authentication

**1. Sign Up**

```bash
curl -X POST https://your-api-url.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

**2. Login**

```bash
curl -X POST https://your-api-url.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

Response:
```json
{
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "test@example.com"
    }
  }
}
```

**3. Create Switch (Authenticated)**

```bash
curl -X POST https://your-api-url.com/api/switches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "Test Switch",
    "message": "This is my secret message",
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

---

## Monitoring & Maintenance

### Logs

**Railway:**
```bash
railway logs
```

**Render:**
View in dashboard → Logs tab

**Fly.io:**
```bash
fly logs
```

### Timer Monitor

The timer monitor runs every 5 minutes checking for expired switches.

Check logs for entries like:
```
Timer monitor: Checking for expired switches
Timer monitor: Found 2 expired switch(es)
```

### Database Backups

**Railway:**
- Automatic daily backups on paid plan
- Manual backup: `railway run pg_dump $DATABASE_URL > backup.sql`

**Render:**
- Automatic daily backups on all plans

**Supabase:**
- Automatic daily backups
- Manual backup in dashboard → Database → Backups

### Performance Monitoring

Monitor these metrics:
- API response times
- Database connection pool usage
- Timer monitor execution time
- Email delivery success rate

**Recommended Tools:**
- [Sentry](https://sentry.io) - Error tracking (free tier)
- [LogTail](https://logtail.com) - Log management
- [UptimeRobot](https://uptimerobot.com) - Uptime monitoring (free)

---

## Troubleshooting

### Database Connection Failed

**Symptom:** `Database connection failed` on startup

**Solutions:**
1. Check `DATABASE_URL` format:
   ```
   postgresql://username:password@host:port/database
   ```
2. Verify database is running:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```
3. Check firewall rules (allow your server IP)
4. Verify SSL requirements (some hosts require `?sslmode=require`)

### Email Not Sending

**Symptom:** Emails not being received

**Solutions:**
1. Check Resend API key is valid
2. Verify domain in Resend dashboard
3. Check DNS records (SPF, DKIM, MX)
4. Look for email logs:
   ```bash
   # Check server logs for email errors
   railway logs | grep "Email"
   ```
5. Test Resend directly:
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "test@yourdomain.com",
       "to": "test@example.com",
       "subject": "Test",
       "text": "Test email"
     }'
   ```

### Timer Monitor Not Running

**Symptom:** Expired switches not being processed

**Solutions:**
1. Check server logs for timer monitor startup:
   ```
   Timer monitor started - checking for expired switches every 5 minutes
   ```
2. Verify cron job is running:
   ```bash
   # Check logs for timer activity
   railway logs | grep "Timer monitor"
   ```
3. Test manually:
   ```bash
   # In production shell
   node -e "import('./src/api/jobs/timerMonitor.js').then(m => m.checkExpiredSwitches())"
   ```

### Rate Limiting Issues

**Symptom:** `429 Too Many Requests`

**Solutions:**
1. Check rate limit settings in `.env`
2. Increase limits if needed:
   ```bash
   RATE_LIMIT_MAX_REQUESTS=200
   AUTH_RATE_LIMIT_MAX_REQUESTS=10
   ```
3. Implement IP allowlist for trusted clients

### CORS Errors

**Symptom:** Browser console shows CORS errors

**Solutions:**
1. Check `CORS_ORIGINS` includes your frontend URL:
   ```bash
   CORS_ORIGINS=https://echolock.xyz,https://www.echolock.xyz
   ```
2. Ensure protocol (http/https) matches
3. Check for trailing slashes

### Memory Issues

**Symptom:** Server crashes with out-of-memory errors

**Solutions:**
1. Increase memory limit:
   - Railway: Settings → Resources → Memory
   - Render: Upgrade plan
2. Check for memory leaks:
   ```bash
   node --max-old-space-size=512 src/api/server.js
   ```
3. Monitor database connection pool:
   ```bash
   DB_POOL_MAX=5  # Reduce if needed
   ```

---

## Cost Breakdown

### Free Tier (Testing)

- **Database**: Railway/Supabase/Neon free tier
- **Hosting**: Render/Fly.io free tier
- **Email**: Resend free tier (100/day)
- **Domain**: Cloudflare/Namecheap ($12/year)

**Total**: ~$1/month

### Production (Low Volume)

- **Database**: Railway ($5/month)
- **Hosting**: Railway ($5/month)
- **Email**: Resend free tier → Pro ($20/month at scale)
- **Domain**: $12/year

**Total**: ~$10/month (scales with usage)

---

## Next Steps

1. **Deploy API** following one of the options above
2. **Test all endpoints** using the examples
3. **Setup monitoring** (UptimeRobot + Sentry)
4. **Build frontend** that consumes this API
5. **Setup custom domain** and SSL
6. **Add analytics** (PostHog, Plausible)
7. **Write API documentation** (Swagger/OpenAPI)

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/echolock/issues
- Documentation: https://docs.echolock.xyz (when ready)

## Security

**IMPORTANT**: Never commit these to git:
- `.env` file
- `JWT_SECRET`
- `SERVICE_ENCRYPTION_KEY`
- `RESEND_API_KEY`
- Database credentials

Add to `.gitignore`:
```
.env
.env.local
.env.production
*.pem
*.key
data/
```

---

**Built with**: Express.js • PostgreSQL • Nostr • Resend • JWT • bcrypt

**License**: MIT
