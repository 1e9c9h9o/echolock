# Deployment Guide for EchoLock

## ✅ Code Successfully Pushed to GitHub!

All UX features have been committed and pushed to:
- **Repository**: https://github.com/1e9c9h9o/echolock
- **Commit**: 737023f - "feat: Add comprehensive UX feature suite with WebSocket backend"
- **Files Changed**: 24 files, 4844 insertions

---

## 🚀 Deploying to Vercel

### Option 1: Automatic Deployment (Recommended)

If you have already connected your GitHub repository to Vercel:

1. **Vercel will automatically detect the push** and start deploying
2. **Check your deployments** at: https://vercel.com/dashboard
3. **Monitor the build** - it should take 2-3 minutes
4. **Your site will be live** at your Vercel domain

### Option 2: Manual Deployment via Vercel CLI

If the repository is not yet connected to Vercel:

```bash
cd frontend

# Login to Vercel (first time only)
npx vercel login

# Deploy to production
npx vercel --prod
```

Follow the prompts to:
1. Set up and link the project
2. Configure project settings
3. Deploy to production

### Option 3: Connect via Vercel Dashboard

1. **Go to**: https://vercel.com/new
2. **Import Git Repository**: Select your GitHub account
3. **Select Repository**: `1e9c9h9o/echolock`
4. **Configure Project**:
   - Framework Preset: **Next.js**
   - Root Directory: **frontend**
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. **Environment Variables** (add these):
   ```
   NEXT_PUBLIC_API_URL=https://api.echolock.xyz
   ```
6. **Click Deploy**

---

## 🔧 Backend Deployment

The backend API server also needs to be deployed. Options:

### Option 1: Railway.app (Recommended for Node.js)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Option 2: Heroku

```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create echolock-api

# Set environment variables
heroku config:set DATABASE_URL=postgresql://...
heroku config:set JWT_SECRET=your-secret-key
heroku config:set RESEND_API_KEY=your-resend-key

# Deploy
git push heroku main
```

### Option 3: DigitalOcean App Platform

1. Go to https://cloud.digitalocean.com/apps
2. Create New App from GitHub
3. Select repository
4. Configure build settings
5. Add environment variables
6. Deploy

---

## 🌐 Environment Variables

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/echolock

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Email Service (Resend.com)
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@echolock.xyz

# Frontend URL (for email links)
FRONTEND_URL=https://echolock.vercel.app

# CORS Origin
CORS_ORIGIN=https://echolock.vercel.app

# Optional: Run jobs on startup
RUN_TIMER_ON_STARTUP=false
RUN_REMINDERS_ON_STARTUP=false
```

---

## 📋 Post-Deployment Checklist

### Frontend
- [ ] Site loads at Vercel URL
- [ ] All 4 languages work (en, es, fr, ar)
- [ ] RTL layout works for Arabic
- [ ] Welcome modal appears for new users
- [ ] Onboarding tour can be started
- [ ] Calendar integration works
- [ ] Language switcher functions
- [ ] Dark mode toggles correctly
- [ ] WebSocket connection established

### Backend
- [ ] API responds at `/health` endpoint
- [ ] Database connection successful
- [ ] WebSocket server running at `/ws`
- [ ] Timer monitor job running (every 5 min)
- [ ] Reminder monitor job running (every hour)
- [ ] Email service configured
- [ ] Authentication endpoints work
- [ ] CORS configured for frontend domain

---

## 🧪 Testing After Deployment

### Frontend Tests

```bash
# Test API connection
curl https://your-frontend.vercel.app/api/health

# Test WebSocket (in browser console)
const ws = new WebSocket('wss://your-backend.com/ws?token=YOUR_JWT_TOKEN');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (msg) => console.log('Message:', msg.data);
```

### Backend Tests

```bash
# Health check
curl https://your-backend.com/health

# WebSocket health
curl https://your-backend.com/health | jq '.websocket'

# Test authentication
curl -X POST https://your-backend.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

---

## 🔍 Troubleshooting

### Frontend Issues

**Build fails on Vercel:**
- Check Node.js version (should be 18+)
- Verify all dependencies installed
- Check for TypeScript errors
- Review Vercel build logs

**WebSocket not connecting:**
- Ensure backend is deployed and running
- Check CORS settings on backend
- Verify WebSocket URL in frontend config
- Check browser console for errors

### Backend Issues

**Database connection fails:**
- Verify DATABASE_URL is set correctly
- Check database is accessible from deployment platform
- Test connection with `psql $DATABASE_URL`

**Emails not sending:**
- Verify RESEND_API_KEY is set
- Check Resend dashboard for errors
- Ensure FROM_EMAIL is verified in Resend

**WebSocket not starting:**
- Check server logs for errors
- Verify port 3000 is accessible
- Ensure HTTP server is created before WebSocket init

---

## 📊 Monitoring

### Vercel Dashboard
- Monitor deployments
- Check build logs
- View analytics
- Configure domains

### Backend Monitoring
- Set up logging (Winston logs to files)
- Monitor cron jobs (timer & reminder monitors)
- Track WebSocket connections
- Database query performance

---

## 🎯 Production Checklist

Before going live:
- [ ] Run security audit
- [ ] Enable SSL/HTTPS (automatic on Vercel)
- [ ] Configure custom domain
- [ ] Set up error monitoring (Sentry)
- [ ] Configure backup strategy
- [ ] Test all user flows end-to-end
- [ ] Load testing
- [ ] Review GDPR compliance
- [ ] Add privacy policy
- [ ] Add terms of service

---

## 📞 Support

If you encounter any issues during deployment:

1. **Check Documentation**:
   - [Vercel Next.js Docs](https://vercel.com/docs/frameworks/nextjs)
   - [Railway Node.js Docs](https://docs.railway.app/guides/nodejs)
   - [EchoLock UX Features](frontend/docs/UX_FEATURES.md)

2. **Review Logs**:
   - Vercel: Dashboard → Project → Deployments → Logs
   - Railway: Dashboard → Project → Deployments → Logs

3. **Common Issues**:
   - Environment variables not set
   - Database connection timeout
   - CORS misconfiguration
   - Build timeout (increase in settings)

---

## ✅ Deployment Complete!

Once deployed, your EchoLock application will be live with:

✨ **All UX Features**:
- 📅 Calendar integration (Google, Outlook, Yahoo, .ics)
- 🎓 Interactive onboarding flow
- ♿ WCAG 2.1 AA accessibility
- 🌍 4 languages with RTL support
- 📧 Email reminders
- 🔌 Real-time WebSocket updates

**Frontend**: https://your-app.vercel.app
**Backend API**: https://your-backend.com
**WebSocket**: wss://your-backend.com/ws

---

**Last Updated**: October 24, 2025
**Deployment Guide Version**: 1.0.0
