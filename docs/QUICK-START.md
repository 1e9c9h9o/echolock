# EchoLock Quick Start Guide

Get EchoLock up and running in 10 minutes.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Resend API key (sign up at [resend.com](https://resend.com))

## Local Development Setup

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/echolock.git
cd echolock
npm install
```

### 2. Setup Database

**Option A: Docker (Easiest)**

```bash
docker run --name echolock-db \
  -e POSTGRES_PASSWORD=password123 \
  -e POSTGRES_DB=echolock \
  -p 5432:5432 \
  -d postgres:14
```

**Option B: Local PostgreSQL**

```bash
# Create database
psql -U postgres
CREATE DATABASE echolock;
\q
```

### 3. Configure Environment

```bash
# Copy example
cp .env.example .env

# Edit .env and set:
DATABASE_URL=postgresql://postgres:password123@localhost:5432/echolock
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
SERVICE_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
RESEND_API_KEY=re_your_key_here
```

### 4. Run Migrations

```bash
npm run db:migrate
```

### 5. Start API Server

```bash
npm run api:dev
# API running on http://localhost:3000
```

### 6. Test API

```bash
# Health check
curl http://localhost:3000/health

# Should return:
# {"status":"healthy","database":"connected",...}
```

## Frontend Setup (Optional)

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
# Frontend running on http://localhost:3001
```

## Quick Test

### Create a User

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

# Copy the accessToken from response
```

### Create a Switch

```bash
curl -X POST http://localhost:3000/api/switches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "My First Switch",
    "message": "This is my secret message",
    "checkInHours": 168,
    "password": "encryption-password",
    "recipients": [
      {
        "email": "recipient@example.com",
        "name": "John Doe"
      }
    ]
  }'
```

## Production Deployment

See [DEPLOYMENT-COMPLETE-GUIDE.md](./DEPLOYMENT-COMPLETE-GUIDE.md) for detailed instructions.

### Railway (Recommended)

```bash
# Install CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway add postgresql
railway up

# Set environment variables in Railway dashboard
# Run migrations
railway run npm run db:migrate
```

### Quick Deploy Buttons

**Railway**:
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/yourusername/echolock)

**Render**:
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/yourusername/echolock)

## Common Commands

```bash
# Development
npm run api:dev              # Start API with hot reload
npm run demo                 # Run demo CLI
npm run nostr-demo          # Test Nostr integration

# Testing
npm test                     # Run all tests
npm run test:unit           # Run unit tests only
npm run test:coverage       # Generate coverage report

# Database
npm run db:migrate          # Run migrations

# Deployment
./deploy.sh railway         # Deploy to Railway
./deploy.sh test           # Test local deployment
```

## Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker ps  # If using Docker
# or
psql -U postgres -c "SELECT 1"

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

### Email Not Sending

```bash
# Verify Resend API key
curl https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"test@yourdomain.com","to":"test@test.com","subject":"Test","text":"Test"}'
```

## Next Steps

1. **Complete the frontend** (see `frontend/` directory)
2. **Deploy to production** (see [DEPLOYMENT-COMPLETE-GUIDE.md](./DEPLOYMENT-COMPLETE-GUIDE.md))
3. **Setup monitoring** (UptimeRobot + Sentry)
4. **Recruit beta testers** (see beta guide)
5. **Create demo video**
6. **Submit to OpenSats**

## Documentation

- **API Guide**: [API-DEPLOYMENT-GUIDE.md](./API-DEPLOYMENT-GUIDE.md)
- **Implementation Guide**: [API-IMPLEMENTATION-GUIDE.md](./API-IMPLEMENTATION-GUIDE.md)
- **Deployment Guide**: [DEPLOYMENT-COMPLETE-GUIDE.md](./DEPLOYMENT-COMPLETE-GUIDE.md)
- **Security Docs**: [docs/P0-SECURITY-FIXES-COMPLETE.md](./docs/P0-SECURITY-FIXES-COMPLETE.md)

## Support

- **GitHub Issues**: https://github.com/yourusername/echolock/issues
- **Email**: support@echolock.xyz
- **Nostr**: [your-npub]

## License

MIT License - see [LICENSE](./LICENSE) file

---

**Ready to build?** Start with `npm run api:dev` and visit the API at http://localhost:3000
