# 🚀 EchoLock Backend Deployment - Quick Start

Your frontend is live at **https://www.echolock.xyz**, but the backend API needs to be deployed.

---

## ⚡ One-Command Deploy (Easiest)

```bash
./deploy-production.sh
```

This script will:
1. ✅ Check Railway CLI installation
2. ✅ Authenticate with Railway
3. ✅ Create/link Railway project
4. ✅ Add PostgreSQL database
5. ✅ Set all environment variables
6. ✅ Deploy your API
7. ✅ Run database migrations
8. ✅ Seed demo user
9. ✅ Show you your API URL

**After deployment**, you just need to:
- Get a Resend API key (for emails): https://resend.com
- Configure DNS (5 minutes): See `DNS-SETUP-GUIDE.md`

---

## 📚 Documentation

| File | Description |
|------|-------------|
| `PRODUCTION-DEPLOYMENT.md` | Complete deployment guide (Railway, Render, alternatives) |
| `deploy-production.sh` | Automated deployment script |
| `.env.production` | Pre-configured environment variables with generated secrets |
| `DNS-SETUP-GUIDE.md` | Step-by-step DNS configuration for all major providers |

---

## 🎯 Deployment Options

### Option 1: Automated Deploy (Recommended)
```bash
./deploy-production.sh
```

### Option 2: Manual Railway Deploy
```bash
railway login
railway init
railway add -d postgresql
# Set environment variables from .env.production
railway up
railway run npm run db:migrate
railway run psql $DATABASE_URL -f src/api/db/seed-demo-user.sql
```

### Option 3: Render.com (No CLI)
See `PRODUCTION-DEPLOYMENT.md` → "Option 2: Render.com"

---

## 🔑 What's Already Configured

✅ **Secrets Generated**:
- JWT_SECRET (128 chars, cryptographically secure)
- SERVICE_ENCRYPTION_KEY (64 chars, cryptographically secure)

✅ **Environment Variables**:
- All variables pre-configured in `.env.production`
- CORS set for www.echolock.xyz
- Frontend URL configured
- Database will be auto-configured by Railway/Render

✅ **Demo User Ready**:
- Email: demo@echolock.xyz
- Password: DemoPass123
- Will be seeded automatically

✅ **Deployment Configs**:
- `railway.json` - Railway configuration
- `render.yaml` - Render configuration
- `package.json` - Start command: `npm run api`

---

## 📋 Quick Checklist

**Before Deployment:**
- [ ] Have a Railway or Render account
- [ ] Know where your domain `echolock.xyz` is managed (Cloudflare, Namecheap, etc.)

**Run Deployment:**
- [ ] Run `./deploy-production.sh`
- [ ] Get Resend API key from https://resend.com
- [ ] Set it: `railway variables set RESEND_API_KEY="re_xxx"`

**After Deployment:**
- [ ] Note your Railway URL (e.g., `echolock-api-production-xxxx.up.railway.app`)
- [ ] Add DNS CNAME record: `api` → Your Railway URL
- [ ] Wait 5-30 minutes for DNS propagation
- [ ] Test: `curl https://api.echolock.xyz/health`
- [ ] Test login at https://www.echolock.xyz/auth/login

---

## 🧪 Testing Your Deployment

### 1. Test Railway Direct URL
```bash
curl https://YOUR-RAILWAY-URL.up.railway.app/health
```

### 2. Test Custom Domain (after DNS)
```bash
curl https://api.echolock.xyz/health
```

### 3. Test Login API
```bash
curl -X POST https://api.echolock.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@echolock.xyz","password":"DemoPass123"}'
```

### 4. Test Frontend Login
1. Go to https://www.echolock.xyz/auth/login
2. Login with:
   - Email: demo@echolock.xyz
   - Password: DemoPass123
3. Should redirect to dashboard

---

## ❓ Common Questions

**Q: Do I need to redeploy the frontend?**
A: No! The frontend is already configured to use `api.echolock.xyz`

**Q: How long does deployment take?**
A: 5-10 minutes for deployment + 5-30 minutes for DNS propagation

**Q: What if I don't have a Resend API key?**
A: The app will work, but email features (verification, password reset) won't work

**Q: Can I use a different domain?**
A: Yes! Update `FRONTEND_URL` and `CORS_ORIGINS` in `.env.production`

**Q: Is HTTPS automatic?**
A: Yes! Both Railway and Render provide free SSL certificates

---

## 🆘 Troubleshooting

**"railway: command not found"**
→ Run: `npm install -g @railway/cli`

**"Unauthorized. Please login"**
→ Run: `railway login`

**"DNS not resolving"**
→ Wait longer, check DNS with: https://dnschecker.org/#CNAME/api.echolock.xyz

**"Login failed"**
→ Check Railway logs: `railway logs`
→ Verify database migrations ran: `railway run npm run db:migrate`

**"CORS error"**
→ Check CORS_ORIGINS includes your frontend domain

---

## 📞 Need Help?

1. **Full Guide**: Read `PRODUCTION-DEPLOYMENT.md`
2. **DNS Issues**: Read `DNS-SETUP-GUIDE.md`
3. **Check Logs**: `railway logs`
4. **Test Locally**: `./deploy.sh test`

---

## ✨ After Successful Deployment

You'll have:
- ✅ Backend API at https://api.echolock.xyz
- ✅ Frontend at https://www.echolock.xyz
- ✅ Demo user ready to test
- ✅ PostgreSQL database with schema
- ✅ Automatic SSL/HTTPS
- ✅ Background jobs running
- ✅ WebSocket support

**Test it now**: https://www.echolock.xyz/auth/login

---

**Ready to deploy?**

```bash
./deploy-production.sh
```

🚀 **Let's go!**
