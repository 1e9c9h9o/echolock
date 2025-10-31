# DNS Configuration Guide for api.echolock.xyz

This guide shows you how to configure DNS to point `api.echolock.xyz` to your backend server.

---

## Overview

You need to create a **CNAME record** that points `api.echolock.xyz` to your Railway or Render deployment.

---

## Step 1: Get Your Backend URL

### For Railway:
After deploying, run:
```bash
railway domain
```

You'll get a URL like: `echolock-api-production-a1b2c3.up.railway.app`

### For Render:
In your Render dashboard:
1. Go to your web service
2. Copy the `.onrender.com` URL shown

---

## Step 2: Configure DNS

You need to add a DNS record wherever your domain `echolock.xyz` is managed.

### Common DNS Providers:

#### Cloudflare
1. Login to https://dash.cloudflare.com
2. Select domain `echolock.xyz`
3. Go to **DNS** section
4. Click **Add record**
5. Configure:
   - **Type**: CNAME
   - **Name**: `api` (or `api.echolock.xyz`)
   - **Target**: Your Railway/Render URL
   - **Proxy status**: DNS only (gray cloud)
   - **TTL**: Auto
6. Click **Save**

#### Namecheap
1. Login to https://namecheap.com
2. Dashboard → Domain List → **Manage** for echolock.xyz
3. Go to **Advanced DNS** tab
4. Click **Add New Record**
5. Configure:
   - **Type**: CNAME Record
   - **Host**: `api`
   - **Value**: Your Railway/Render URL
   - **TTL**: Automatic
6. Click **Save**

#### GoDaddy
1. Login to https://godaddy.com
2. My Products → **DNS** for echolock.xyz
3. Click **Add** → **CNAME**
4. Configure:
   - **Name**: `api`
   - **Value**: Your Railway/Render URL
   - **TTL**: 1 Hour
5. Click **Save**

#### Google Domains
1. Login to https://domains.google.com
2. Select `echolock.xyz`
3. Go to **DNS** section
4. Scroll to **Custom records**
5. Click **Manage custom records** → **Create new record**
6. Configure:
   - **Host name**: `api`
   - **Type**: CNAME
   - **TTL**: 1H
   - **Data**: Your Railway/Render URL
7. Click **Save**

#### Route 53 (AWS)
1. Open AWS Console → Route 53
2. Go to **Hosted zones** → `echolock.xyz`
3. Click **Create record**
4. Configure:
   - **Record name**: `api`
   - **Record type**: CNAME
   - **Value**: Your Railway/Render URL
   - **TTL**: 300
5. Click **Create records**

---

## Step 3: Verify DNS Configuration

### Check DNS Records
```bash
# Check CNAME record
dig api.echolock.xyz CNAME

# Or use nslookup
nslookup api.echolock.xyz
```

### Online DNS Checker
Go to: https://dnschecker.org/#CNAME/api.echolock.xyz

This shows DNS propagation globally. All regions should show your Railway/Render URL.

---

## Step 4: Wait for DNS Propagation

DNS changes can take:
- **5-10 minutes**: Most cases
- **Up to 48 hours**: Worst case (rare)

You can check propagation status at: https://dnschecker.org

---

## Step 5: Test Your API

Once DNS has propagated:

### Test Health Endpoint
```bash
curl https://api.echolock.xyz/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-25T...",
  "database": "Connected",
  "websocket": "Active"
}
```

### Test Login
```bash
curl -X POST https://api.echolock.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@echolock.xyz","password":"DemoPass123"}'
```

Expected: JWT tokens in response

---

## Railway Custom Domain Setup (Alternative)

Instead of manually configuring DNS, you can use Railway's custom domain feature:

1. Go to https://railway.app/dashboard
2. Select your project
3. Go to **Settings** → **Domains**
4. Click **Custom Domain**
5. Enter: `api.echolock.xyz`
6. Railway will show you the DNS records to add
7. Add those records to your DNS provider
8. Railway will automatically verify and enable SSL

---

## Render Custom Domain Setup (Alternative)

1. Go to your Render web service dashboard
2. Click **Settings** → **Custom Domain**
3. Click **Add Custom Domain**
4. Enter: `api.echolock.xyz`
5. Render will show you the CNAME record
6. Add that record to your DNS provider
7. Render will verify and enable SSL automatically

---

## SSL/HTTPS Certificate

Both Railway and Render automatically provision SSL certificates via Let's Encrypt once your custom domain is configured. No manual setup needed!

---

## Troubleshooting

### "DNS_PROBE_FINISHED_NXDOMAIN"
- DNS hasn't propagated yet - wait 10-30 minutes
- Check that CNAME record was added correctly
- Verify you're using the correct Railway/Render URL

### "This site can't be reached"
- Check that backend is deployed and running
- Verify health endpoint works with Railway/Render URL
- Check that custom domain is configured in Railway/Render

### "NET::ERR_CERT_AUTHORITY_INVALID"
- SSL certificate is still being provisioned
- Wait 5-10 minutes after DNS propagates
- Verify custom domain is properly configured

### DNS Not Updating
- Clear your DNS cache:
  ```bash
  # macOS/Linux
  sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

  # Windows
  ipconfig /flushdns
  ```
- Try a different DNS checker tool
- Wait longer (up to 48 hours in rare cases)

---

## Quick Reference

### DNS Record Format

For Railway:
```
Type:  CNAME
Name:  api
Value: echolock-api-production-xxxx.up.railway.app
TTL:   300 (or Auto)
```

For Render:
```
Type:  CNAME
Name:  api
Value: echolock-api.onrender.com
TTL:   300 (or Auto)
```

### Testing Commands

```bash
# Check DNS resolution
dig api.echolock.xyz

# Test health endpoint
curl https://api.echolock.xyz/health

# Test from www.echolock.xyz
curl -X POST https://api.echolock.xyz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@echolock.xyz","password":"DemoPass123"}'
```

---

## Next Steps

Once DNS is configured and propagated:

1. ✅ Test API health endpoint
2. ✅ Test login from command line
3. ✅ Visit https://www.echolock.xyz/auth/login
4. ✅ Login with demo@echolock.xyz / DemoPass123
5. ✅ Verify you can access the dashboard

---

**Questions?** Check your DNS provider's documentation or Railway/Render's custom domain setup guides.
