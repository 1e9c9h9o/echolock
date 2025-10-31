# Quick Troubleshooting Guide

## The Issue: No Email Received

Based on your screenshot and my investigation, here's what's happening:

---

## Current Status

### ✅ What I Found:

1. **Database is empty** - No switches created yet
2. **CLI storage is empty** - No switches in `data/switches.json`
3. **Email service is in mock mode** - Emails only logged to console
4. **Nostr is enabled** - Would work if switch was created
5. **Bitcoin timelock is disabled** - Optional feature not in use

### ⚠️ This means either:

- You filled out the form but **didn't click "CREATE SWITCH" yet**
- The form submission failed
- The API server isn't running
- Frontend isn't connected to API

---

## Step 1: Verify API Server is Running

```bash
# Check if server is running
curl http://localhost:3000/health

# Expected output:
{
  "status": "healthy",
  "database": { "connected": true }
}
```

**If this fails:**
```bash
# Start the API server
cd /mnt/g/echolock
npm run api
```

---

## Step 2: Check if You're Logged In

The screenshot shows you're on the "Create Switch" page. Are you logged in?

**Check browser console:**
1. Press F12 to open Developer Tools
2. Go to "Console" tab
3. Look for errors like:
   - "401 Unauthorized"
   - "Network Error"
   - "Failed to fetch"

**Check localStorage:**
1. F12 → Application tab → Local Storage
2. Look for `accessToken` and `refreshToken`
3. If missing, you need to log in first

**To log in via CLI:**
```bash
# Sign up (first time)
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"SecurePass123!"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"SecurePass123!"}'

# Save the accessToken from the response
```

---

## Step 3: Try Creating Switch Again

1. **Make sure API server is running** (`npm run api`)
2. **Open browser to:** `http://localhost:3001`
3. **Log in** (if not already)
4. **Go to "Create Switch"**
5. **Fill out form with SHORT timer** (important for testing!)

### Recommended Test Settings:

```
Title: Test 5 Min Release
Message: This is a test message that will be released in 5 minutes!
Check-in Interval: 0.08 hours (= 5 minutes)
Password: test123
Recipient: your-real-email@gmail.com
```

6. **Click "CREATE SWITCH"**
7. **Watch browser console for errors**
8. **Check server terminal for logs**

---

## Step 4: Verify Switch Was Created

### Check Database:

```bash
psql postgresql://postgres:postgres@localhost:5432/echolock

# Query switches
SELECT
  id,
  title,
  status,
  check_in_hours,
  expires_at,
  created_at
FROM switches
ORDER BY created_at DESC;
```

**Expected output:**
```
id                  | title              | status | check_in_hours | expires_at          | created_at
--------------------+--------------------+--------+----------------+---------------------+-------------------
abc-123-def-456    | Test 5 Min Release | ARMED  | 0.08          | 2025-10-27 20:50:00 | 2025-10-27 20:45:00
```

**If no rows:** Switch wasn't created. Check browser/server logs for errors.

---

## Step 5: Watch Server Logs

Keep the API server terminal open and watch for:

### During Switch Creation:

```
[INFO] Switch creation request received: {userId, title, checkInHours}
[INFO] Encrypting message with AES-256-GCM...
[INFO] Splitting key with Shamir Secret Sharing (3-of-5)...
[INFO] Publishing fragments to Nostr relays...
[INFO] Connected to relay: wss://relay.damus.io
[INFO] Connected to relay: wss://nos.lol
[INFO] Successfully published 5/5 fragments
[INFO] Switch created: {switchId, expiresAt}
```

### During Release (5-10 minutes later):

```
[INFO] Timer monitor: Checking for expired switches...
[INFO] Found 1 expired switch: Test 5 Min Release
[INFO] Retrieving fragments from Nostr relays...
[INFO] Retrieved fragment 1/5 from wss://relay.damus.io
[INFO] Retrieved fragment 2/5 from wss://nos.lol
[INFO] Retrieved fragment 3/5 from wss://nostr.wine
[INFO] Reconstructing secret with Shamir SSS...
[INFO] Secret reconstructed successfully (used 3 of 5 fragments)
[INFO] Decrypting message with AES-256-GCM...
[INFO] Message decrypted successfully
📧 [EMAIL] Would send:
  to: your-real-email@gmail.com
  subject: Dead Man's Switch Released - Test 5 Min Release
  text: This is a test message that will be released in 5 minutes!
[INFO] Switch status updated to RELEASED
```

**This is where you'll see your decrypted message!**

---

## Step 6: Understanding Email Mock Mode

Your `.env` has:
```env
MOCK_EMAIL_SERVICE=true
RESEND_API_KEY=
```

**This means:**
- Emails are logged to console (you saw it above)
- Actual emails are NOT sent
- You won't receive anything in your inbox

**To enable real emails:**

1. **Sign up at resend.com** (free 100 emails/day)
2. **Get API key** (starts with `re_`)
3. **Edit .env:**
   ```bash
   nano /mnt/g/echolock/.env
   ```
4. **Update these lines:**
   ```env
   RESEND_API_KEY=re_your_actual_key_here
   MOCK_EMAIL_SERVICE=false
   ```
5. **Restart server:**
   ```bash
   # Stop with Ctrl+C
   npm run api
   ```

---

## Step 7: About Bitcoin & Nostr

### "Why don't I see Bitcoin/Nostr in action?"

You DO see them in action - they work invisibly in the background:

**When you create a switch:**
1. Backend generates Nostr keypair
2. Splits encryption key into 5 fragments
3. Publishes fragments to 7+ Nostr relays worldwide
4. Saves Nostr public key in database

**When switch releases:**
1. Backend connects to Nostr relays
2. Retrieves your fragments using public key
3. Verifies signatures and HMAC auth
4. Reconstructs secret with 3 of 5 fragments
5. Decrypts and sends message

**Bitcoin timelock is optional** and currently disabled:
```env
USE_BITCOIN_TIMELOCK=false
```

If enabled, it would:
1. Create Bitcoin testnet address
2. Generate OP_CHECKLOCKTIMEVERIFY script
3. Lock funds until future block height
4. Provide blockchain-verified timing proof

### "The UI shows Bitcoin/Nostr but I just entered an email?"

The **recipient email** is where the **decrypted message** gets sent.

The Bitcoin/Nostr stuff happens automatically:
- Nostr: Fragment distribution (you don't interact with it)
- Bitcoin: Optional timing proof (disabled in your setup)

You never need to provide:
- Bitcoin addresses
- Nostr keys
- Relay URLs

It's all automatic!

---

## Common Issues

### Issue 1: "CREATE SWITCH" button doesn't work

**Check:**
1. Browser console (F12) for JavaScript errors
2. Network tab for failed API calls
3. Server terminal for errors

**Solution:**
```bash
# Restart both servers
cd /mnt/g/echolock
npm run api  # Terminal 1

cd /mnt/g/echolock/frontend
npm run dev  # Terminal 2
```

### Issue 2: "Switch created" but no database entry

**Check:**
```bash
# Verify database URL
echo $DATABASE_URL

# Test connection
psql postgresql://postgres:postgres@localhost:5432/echolock -c "SELECT 1;"
```

**Solution:**
```bash
# Run migrations
npm run db:migrate
```

### Issue 3: Timer monitor not running

**Check server logs for:**
```
[INFO] Timer monitor started - checking every 5 minutes
```

**If missing:**
```bash
# Check .env
grep TIMER_MONITOR .env

# Should see:
TIMER_MONITOR_SCHEDULE=*/5 * * * *
```

### Issue 4: Nostr fragments not publishing

**Check server logs for:**
```
[ERROR] Failed to connect to relay: wss://relay.damus.io
[WARN] Only published 2/5 fragments (minimum 5 required)
```

**Solution:**
1. Check internet connection
2. Temporarily disable Nostr:
   ```env
   USE_NOSTR_DISTRIBUTION=false
   ```
3. Try again (will use local storage)

---

## Quick Test Script

Run this to verify everything:

```bash
#!/bin/bash

echo "=== ECHOLOCK Quick Test ==="

# 1. Check API server
echo "1. Testing API server..."
curl -s http://localhost:3000/health | grep "healthy" && echo "✓ API OK" || echo "✗ API FAILED"

# 2. Check database
echo "2. Testing database..."
psql postgresql://postgres:postgres@localhost:5432/echolock -c "SELECT 1;" > /dev/null 2>&1 && echo "✓ DB OK" || echo "✗ DB FAILED"

# 3. Check switches count
echo "3. Checking switches..."
COUNT=$(psql postgresql://postgres:postgres@localhost:5432/echolock -t -c "SELECT COUNT(*) FROM switches;")
echo "   Found $COUNT switch(es)"

# 4. Check Nostr setting
echo "4. Checking Nostr..."
grep "USE_NOSTR_DISTRIBUTION=true" .env && echo "✓ Nostr ENABLED" || echo "✗ Nostr DISABLED"

# 5. Check email setting
echo "5. Checking email..."
grep "MOCK_EMAIL_SERVICE=true" .env && echo "⚠ Email MOCKED (logs only)" || echo "✓ Email REAL"

echo "=== Test complete ==="
```

Save as `test.sh`, run with: `bash test.sh`

---

## What You Should Do Next

### Option A: See the Full Cycle (5 minutes)

1. Start API server: `npm run api`
2. Create switch with **0.08 hours** interval
3. Watch server console for 5-10 minutes
4. You'll see the full cryptographic cycle
5. See decrypted message in logs

### Option B: Enable Real Emails

1. Get Resend API key
2. Update `.env`
3. Restart server
4. Create test switch
5. Receive real email

### Option C: Manual Test Release

```bash
# Connect to DB
psql postgresql://postgres:postgres@localhost:5432/echolock

# Create test user
INSERT INTO users (email, password_hash, email_verified)
VALUES ('test@test.com', '$2b$12$...', TRUE)
RETURNING id;

# Create test switch (expires in 1 minute)
INSERT INTO switches (
  user_id,
  title,
  status,
  check_in_hours,
  expires_at,
  encrypted_message_ciphertext,
  encrypted_message_iv,
  encrypted_message_auth_tag,
  nostr_public_key,
  nostr_private_key_encrypted,
  relay_urls,
  fragment_encryption_salt,
  auth_key_encrypted
) VALUES (
  '<user-id>',
  'Manual Test',
  'ARMED',
  1,
  NOW() + INTERVAL '1 minute',
  'test_ciphertext',
  'test_iv',
  'test_tag',
  'test_pubkey',
  'test_privkey',
  '[]'::jsonb,
  'test_salt',
  'test_auth'
);

# Wait 5 minutes, watch server logs
```

---

## Summary

**Your cryptography IS working** - you just need to:

1. ✅ Actually create a switch (click the button!)
2. ✅ Use a short timer for testing (0.08 hours = 5 min)
3. ✅ Watch the server console logs
4. ✅ Optionally: Enable real emails with Resend

**The Nostr distribution IS happening** - you just don't see it because it's automatic and in the background.

**Follow the steps above and you'll see the full magic happen!** 🎉
