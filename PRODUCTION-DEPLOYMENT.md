# EchoLock Production Deployment Guide

## ✅ Current Production Status

**ECHOLOCK is currently deployed and running in production!**

### Live URLs
- **Frontend:** https://www.echolock.xyz (Vercel)
- **API:** https://echolock-api-production.up.railway.app (Railway)
- **Database:** PostgreSQL on Railway

### Demo Account
- Email: demo@echolock.xyz
- Password: DemoPass123

---

## Current Infrastructure

### Frontend (Vercel)
- **Project:** echolocks-projects/frontend (or echolock)
- **Production URL:** https://www.echolock.xyz
- **Custom Domains:**
  - www.echolock.xyz (primary)
  - echolock.xyz (redirects to www)
- **Framework:** Next.js 14
- **Deploy Method:** Git auto-deploy from `main` branch
- **Environment Variables:**
  - `NEXT_PUBLIC_API_URL=https://echolock-api-production.up.railway.app`

### Backend (Railway)
- **Project:** echolock-api-production
- **Production URL:** https://echolock-api-production.up.railway.app
- **Database:** PostgreSQL (managed by Railway)
- **Framework:** Express.js + Node.js
- **Deploy Method:** Manual via Railway CLI or automatic from GitHub

### Recent Updates (October 2025)
- ✅ Mobile-responsive design improvements
- ✅ Viewport meta tags configured
- ✅ Responsive typography system
- ✅ Touch-friendly UI elements
- ✅ Optimized for screens 320px+

---

## Deploying Updates

### Update Frontend (Vercel)

**Method 1: Auto-deploy (Recommended)**
1. Push changes to GitHub `main` branch
2. Vercel automatically detects and deploys
3. Check deployment status at: https://vercel.com/echolocks-projects

**Method 2: Manual Deploy**
```bash
cd frontend
vercel --prod
```

### Update Backend (Railway)

**Current setup:** Already deployed at `echolock-api-production.up.railway.app`

**Method 1: Auto-deploy from GitHub (if configured)**
1. Push changes to GitHub
2. Railway automatically deploys

**Method 2: Manual Deploy via CLI**
```bash
# Login to Railway
railway login

# Link to existing project
railway link

# Deploy changes
railway up
```

**Method 3: From Railway Dashboard**
1. Go to https://railway.app/dashboard
2. Select "echolock-api-production"
3. Click "Deploy" → "Redeploy"

### Run Database Migrations (if needed)
```bash
railway run npm run db:migrate
```

---

## Setting Up From Scratch (New Deployment)

If you need to deploy to a new Railway instance:

### Step 1: Login to Railway
```bash
railway login
```

### Step 2: Create New Project
```bash
railway init
```
Name it "echolock-api-production"

### Step 3: Add PostgreSQL Database
```bash
railway add -d postgresql
```

### Step 4: Set Environment Variables

```bash
# JWT Secret
railway variables set JWT_SECRET="0f16e0054c988fcca0183445fb0eb2cf81247b31da26b9c65edb4e5b411c184c914f0901ca7fb39c471a1793065f20e2bbbe0f43f7414d3cf9578dbb11b19329"

# Service Encryption Key
railway variables set SERVICE_ENCRYPTION_KEY="5707cf613fa6b6e500ea2fb856da91c3c670c4e413975f5f98366335fecd398d"

# Email configuration
railway variables set RESEND_API_KEY="your_resend_api_key"
railway variables set FROM_EMAIL="EchoLock <noreply@echolock.xyz>"

# Frontend URL
railway variables set FRONTEND_URL="https://www.echolock.xyz"

# CORS Origins
railway variables set CORS_ORIGINS="https://echolock.xyz,https://www.echolock.xyz"

# Node Environment
railway variables set NODE_ENV="production"

# Nostr Relays
railway variables set NOSTR_RELAYS="wss://relay.damus.io,wss://nos.lol,wss://relay.nostr.band"
```

### Step 5: Deploy
```bash
railway up
```

### Step 6: Initialize Database
```bash
railway run npm run db:migrate
railway run psql \$DATABASE_URL -f src/api/db/seed-demo-user.sql
```

### Step 7: Get Railway Domain
```bash
railway domain
```

---

## Setting Up Custom Domains (Optional)

If you want to use `api.echolock.xyz` instead of the Railway-generated URL:

1. Go to Railway Dashboard
2. Select your project
3. Settings → Domains → Add Domain
4. Enter: `api.echolock.xyz`
5. Add CNAME record to your DNS provider:
   - Type: CNAME
   - Name: api
   - Value: [your-railway-domain]
   - TTL: 300

---

## Option 2: Render.com (Easiest - No CLI Required)

### Step 1: Push Code to GitHub
Your code is already on GitHub at: https://github.com/1e9c9h9o/echolock

### Step 2: Create Web Service on Render
1. Go to https://render.com/dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub account
4. Select repository: `1e9c9h9o/echolock`

### Step 3: Configure Service
- **Name**: echolock-api
- **Region**: Oregon (US West) or closest to you
- **Branch**: main
- **Root Directory**: (leave empty)
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm run api`

### Step 4: Add PostgreSQL Database
1. Click "New +" → "PostgreSQL"
2. Name: echolock-db
3. Click "Create Database"
4. Copy the "Internal Database URL"

### Step 5: Set Environment Variables
In your web service settings, add these environment variables:

```
NODE_ENV=production
DATABASE_URL=(paste the Internal Database URL from step 4)
JWT_SECRET=0f16e0054c988fcca0183445fb0eb2cf81247b31da26b9c65edb4e5b411c184c914f0901ca7fb39c471a1793065f20e2bbbe0f43f7414d3cf9578dbb11b19329
SERVICE_ENCRYPTION_KEY=5707cf613fa6b6e500ea2fb856da91c3c670c4e413975f5f98366335fecd398d
RESEND_API_KEY=re_YOUR_API_KEY_HERE
FROM_EMAIL=EchoLock <noreply@echolock.xyz>
FRONTEND_URL=https://www.echolock.xyz
CORS_ORIGINS=https://echolock.xyz,https://www.echolock.xyz
NOSTR_RELAYS=wss://relay.damus.io,wss://nos.lol,wss://relay.nostr.band
```

### Step 6: Deploy
Click "Create Web Service" - Render will automatically deploy.

### Step 7: Run Database Setup
Once deployed, go to "Shell" tab and run:
```bash
npm run db:migrate
psql $DATABASE_URL -f src/api/db/seed-demo-user.sql
```

### Step 8: Configure Custom Domain
1. In your web service, go to "Settings" → "Custom Domain"
2. Add: `api.echolock.xyz`
3. Copy the CNAME record shown

---

## DNS Configuration

After deploying, you need to point `api.echolock.xyz` to your backend server.

### For Railway:
Add this DNS record to your domain provider (e.g., Namecheap, GoDaddy, Cloudflare):

```
Type: CNAME
Name: api
Value: echolock-api-production-xxxx.up.railway.app
TTL: 300 (or automatic)
```

### For Render:
Add this DNS record:

```
Type: CNAME
Name: api
Value: (provided by Render, usually something like echolock-api.onrender.com)
TTL: 300 (or automatic)
```

### DNS Propagation
DNS changes can take 5-60 minutes to propagate. You can check status at: https://dnschecker.org/#CNAME/api.echolock.xyz

---

## Get Resend API Key (Required for Emails)

1. Go to https://resend.com/signup
2. Sign up for free account
3. Verify your email
4. Add and verify your domain `echolock.xyz`
5. Generate an API key
6. Use this key for the `RESEND_API_KEY` variable

---

## Verify Production Deployment

### Test Frontend
Visit: https://www.echolock.xyz

Should show:
- ✅ Homepage loads with mobile-responsive layout
- ✅ Login/Signup buttons work
- ✅ Demo account login works
- ✅ Dashboard displays after login

### Test API Health
```bash
curl https://echolock-api-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "...",
  "database": "Connected",
  "websocket": "Active"
}
```

### Test Authentication
```bash
curl -X POST https://echolock-api-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@echolock.xyz","password":"DemoPass123"}'
```

Expected: JWT access and refresh tokens in response

### Test Frontend ↔ API Connection
1. Visit https://www.echolock.xyz
2. Login with demo account
3. Create a test switch
4. Verify it appears in dashboard
5. Check browser console for any API errors

---

## Production Deployment Checklist

### Current Status ✅
- [x] Frontend deployed to Vercel at www.echolock.xyz
- [x] Backend deployed to Railway at echolock-api-production.up.railway.app
- [x] PostgreSQL database created and running
- [x] Database migrations completed
- [x] Demo user seeded (demo@echolock.xyz)
- [x] All environment variables configured
- [x] Frontend configured to use Railway API
- [x] Mobile-responsive improvements deployed
- [x] SSL/HTTPS enabled (automatic)
- [x] Demo account login verified
- [x] API health endpoint responding

### For New Deployments
- [ ] Clone repository from GitHub
- [ ] Deploy backend to Railway
- [ ] Configure environment variables
- [ ] Run database migrations
- [ ] Deploy frontend to Vercel
- [ ] Configure custom domains (optional)
- [ ] Test all endpoints
- [ ] Verify mobile responsiveness

---

## Troubleshooting

### "Database connection failed"
- Check that DATABASE_URL is set correctly
- Verify PostgreSQL instance is running
- Check database credentials

### "CORS error"
- Verify CORS_ORIGINS includes your frontend domains
- Check both https://echolock.xyz and https://www.echolock.xyz

### "Email not sending"
- Verify RESEND_API_KEY is set
- Check that echolock.xyz domain is verified in Resend
- Check Resend logs for delivery issues

### "DNS not resolving"
- Wait 5-60 minutes for propagation
- Check DNS configuration at https://dnschecker.org
- Verify CNAME record is correct

---

## Quick Deploy Script

For Railway (after setting up the project):

```bash
#!/bin/bash
# Run this from the echolock directory

# Login and select project
railway login
railway link

# Deploy
railway up

# Set up database
railway run npm run db:migrate
railway run psql \$DATABASE_URL -f src/api/db/seed-demo-user.sql

# Get URL
railway domain

echo "✅ Deployment complete!"
echo "Add DNS CNAME record: api -> (your railway domain)"
```

---

## Security Checklist

- [x] JWT_SECRET is cryptographically random (64 bytes)
- [x] SERVICE_ENCRYPTION_KEY is cryptographically random (32 bytes)
- [ ] RESEND_API_KEY is kept secret
- [ ] Database credentials are not exposed
- [x] CORS is properly configured
- [ ] SSL/HTTPS is enabled (automatic on Railway/Render)
- [ ] Environment variables are set in platform (not in code)

---

## Support

If you encounter issues:
1. Check deployment logs in Railway/Render dashboard
2. Test local deployment with `./deploy.sh test`
3. Verify all environment variables are set
4. Check database connectivity

---

**Generated**: $(date)
**Status**: Ready to deploy
