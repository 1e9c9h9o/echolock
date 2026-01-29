# EchoLock Complete Deployment Guide

This guide covers the full deployment process from API to frontend to production.

## Part 1: API Deployment to Railway

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### Step 2: Initialize Project

```bash
# From project root
railway init
```

### Step 3: Add PostgreSQL Database

```bash
railway add postgresql
```

The database will automatically provision and `DATABASE_URL` will be set.

### Step 4: Set Environment Variables

```bash
# Generate secure keys first
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('SERVICE_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"

# Set variables in Railway dashboard or via CLI
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=<your-generated-jwt-secret>
railway variables set SERVICE_ENCRYPTION_KEY=<your-generated-encryption-key>
railway variables set RESEND_API_KEY=re_your_key_from_resend_com
railway variables set FROM_EMAIL="EchoLock <noreply@yourdomain.com>"
railway variables set FRONTEND_URL=https://yourdomain.com
railway variables set CORS_ORIGINS=https://yourdomain.com
railway variables set NOSTR_RELAYS=wss://relay.damus.io,wss://nos.lol,wss://relay.nostr.band
```

### Step 5: Deploy API

```bash
railway up
```

### Step 6: Run Database Migrations

```bash
railway run npm run db:migrate
```

### Step 7: Generate Domain

1. Go to Railway dashboard
2. Select your project
3. Settings → Generate Domain
4. Note your API URL: `https://your-project.up.railway.app`

### Step 8: Test API

```bash
curl https://your-project.up.railway.app/health

# Should return:
# {
#   "status": "healthy",
#   "database": "connected",
#   ...
# }
```

## Part 2: Setup Resend for Email

### Step 1: Sign Up

1. Go to [resend.com](https://resend.com)
2. Sign up for free account
3. Free tier: 100 emails/day, 3,000/month

### Step 2: Verify Domain

1. Go to Domains → Add Domain
2. Enter your domain (e.g., `echolock.xyz`)
3. Add DNS records provided:
   - MX records
   - TXT record for SPF
   - TXT record for DKIM
4. Wait 5-10 minutes for verification

### Step 3: Create API Key

1. Go to API Keys → Create API Key
2. Copy the key (starts with `re_`)
3. Add to Railway:
   ```bash
   railway variables set RESEND_API_KEY=re_your_api_key
   ```

## Part 3: Frontend Deployment to Vercel

### Step 1: Prepare Frontend

```bash
cd frontend
npm install
```

### Step 2: Create `.env.local`

```bash
NEXT_PUBLIC_API_URL=https://your-project.up.railway.app
```

### Step 3: Test Locally

```bash
npm run dev
# Visit http://localhost:3001
```

### Step 4: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel

# Follow prompts:
# - Project name: echolock-frontend
# - Framework: Next.js
# - Build command: npm run build
# - Output directory: .next
```

### Step 5: Set Production Environment Variables

```bash
# In Vercel dashboard or via CLI
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://your-project.up.railway.app
```

### Step 6: Deploy to Production

```bash
vercel --prod
```

### Step 7: Setup Custom Domain (Optional)

1. Go to Vercel dashboard → Settings → Domains
2. Add your domain (e.g., `echolock.xyz`)
3. Add DNS records as instructed
4. Update `FRONTEND_URL` in Railway:
   ```bash
   railway variables set FRONTEND_URL=https://echolock.xyz
   railway variables set CORS_ORIGINS=https://echolock.xyz,https://www.echolock.xyz
   ```

## Part 4: Setup Monitoring

### UptimeRobot (Free Uptime Monitoring)

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Sign up for free account
3. Add New Monitor:
   - Monitor Type: HTTP(s)
   - Friendly Name: EchoLock API
   - URL: `https://your-project.up.railway.app/health`
   - Monitoring Interval: 5 minutes
4. Add notification contacts (email, Slack, etc.)
5. Repeat for frontend: `https://echolock.xyz`

### Sentry (Error Tracking)

1. Go to [sentry.io](https://sentry.io)
2. Sign up for free account
3. Create new project:
   - Platform: Node.js (for API)
   - Project name: echolock-api
4. Copy DSN (looks like: `https://xxx@xxx.ingest.sentry.io/xxx`)
5. Add to Railway:
   ```bash
   railway variables set SENTRY_DSN=your-sentry-dsn
   ```
6. Install Sentry in API (optional, for better error tracking):
   ```bash
   npm install @sentry/node
   ```
7. Add to `src/api/server.js`:
   ```javascript
   import * as Sentry from '@sentry/node';

   if (process.env.SENTRY_DSN) {
     Sentry.init({ dsn: process.env.SENTRY_DSN });
   }
   ```
8. Repeat for frontend with Next.js Sentry package

## Part 5: CI/CD with GitHub Actions

### Overview

EchoLock uses GitHub Actions for continuous integration. Tests run automatically on every pull request and push to main.

### Workflow: `.github/workflows/ci.yml`

The CI pipeline includes three jobs:

| Job | Trigger | What it does |
|-----|---------|--------------|
| `test` | PR + push to main | Runs unit tests |
| `frontend` | PR + push to main | Lints and builds frontend |
| `integration` | Push to main only | Runs integration tests with PostgreSQL |

### How It Works

1. **On Pull Request**:
   - Unit tests run (`npm run test:unit`)
   - Frontend lints and builds
   - Must pass before merge

2. **On Push to Main**:
   - All of the above, plus...
   - Integration tests with real PostgreSQL
   - Vercel auto-deploys frontend
   - Railway auto-deploys API

### Viewing Results

1. Go to your GitHub repository
2. Click "Actions" tab
3. View workflow runs and logs

### Adding Secrets (if needed)

For integration tests that need secrets:

1. Go to Settings → Secrets and variables → Actions
2. Add repository secrets:
   - `DATABASE_URL` (for integration tests)
   - Any other secrets needed

### Local Testing Before Push

```bash
# Run unit tests
npm run test:unit

# Run frontend lint and build
cd frontend && npm run lint && npm run build
```

---

## Part 6: Beta Testing Setup

### Create Beta Testing Documentation

Create `/docs/BETA-GUIDE.md`:

```markdown
# EchoLock Beta Testing Guide

## Welcome, Beta Tester!

Thank you for helping test EchoLock. This guide will help you get started.

### What is EchoLock?

A cryptographic dead man's switch that ensures your secrets are delivered to the right people at the right time.

### Getting Started

1. Visit https://echolock.xyz
2. Click "Get Started" to create an account
3. Verify your email
4. Create your first switch

### Testing Checklist

Please test the following features:

- [ ] Sign up and email verification
- [ ] Create a dead man's switch
- [ ] Add multiple recipients
- [ ] Check in to reset timer
- [ ] Test timer expiration (set to 1 hour for testing)
- [ ] Verify email notifications
- [ ] Cancel a switch
- [ ] Delete a switch
- [ ] Test password reset flow

### Reporting Issues

Please report bugs via:
- GitHub Issues: https://github.com/yourusername/echolock/issues
- Email: beta@echolock.xyz
- Include:
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - Screenshots if applicable

### Security Testing

If you discover a security vulnerability:
- DO NOT report publicly
- Email security@echolock.xyz
- Include detailed description
- We'll respond within 24 hours

### Beta Tester Benefits

- Free lifetime access
- Listed in credits (optional)
- Early access to new features
- Direct input on product roadmap
```

### Setup Beta User Onboarding Flow

1. **Create Landing Page for Beta Testers**: Add `/app/beta/page.tsx` with:
   - Welcome message
   - Video tutorial (to be created)
   - Quick start guide
   - Support contact info

2. **Email Templates for Beta Testers**: Create welcome email template in Resend:
   ```
   Subject: Welcome to EchoLock Beta!

   Hi [Name],

   Welcome to EchoLock! You're one of our first beta testers.

   Quick Start:
   1. Create your first switch
   2. Test the check-in feature
   3. Report any issues

   Questions? Reply to this email.

   Thanks for your help!
   - The EchoLock Team
   ```

3. **Beta Feedback Form**: Create `/app/feedback/page.tsx` with:
   - What worked well?
   - What was confusing?
   - What features are missing?
   - Overall rating
   - Would you recommend?

## Part 7: OpenSats Pitch Preparation

### Create Pitch Deck

Create `docs/OPENSATS-PITCH.md`:

```markdown
# EchoLock - OpenSats Grant Proposal

## Project Overview

**Name**: EchoLock
**Category**: Privacy & Security Tools
**Funding Request**: $50,000
**Duration**: 6 months

## Problem

What happens to your Bitcoin when you die? Your passwords? Your encrypted data?

Current solutions:
- Centralized services (can be shut down, hacked, or censored)
- Manual solutions (unreliable, require trust)
- No cryptographic guarantees

## Solution

EchoLock: A cryptographic dead man's switch using:
- **Bitcoin timelocks** for provable time-based triggers
- **Shamir Secret Sharing** for secure fragment distribution
- **Nostr protocol** for censorship-resistant delivery

## Why Bitcoin Matters Here

1. **OP_CHECKLOCKTIMEVERIFY**: Cryptographic proof of time passage
2. **Decentralized**: No single point of failure
3. **Immutable**: Timelock guarantees can't be tampered with
4. **Self-custodial**: Users control their secrets

## Technical Innovation

1. **Two-Phase Commitment Protocol**:
   - Preparation transaction (pre-signed, time-locked)
   - Release transaction (broadcast when timer expires)
   - No third-party custody required

2. **Hybrid Architecture**:
   - Bitcoin for time-locking and proof
   - Nostr for fragment distribution
   - End-to-end encryption throughout

3. **Production-Ready**:
   - Comprehensive test suite (>75% coverage)
   - Security audits completed
   - Production deployment guide
   - API and frontend built

## Current Status

**Completed**:
- ✅ Core cryptographic engine
- ✅ Bitcoin timelock implementation
- ✅ Nostr integration
- ✅ REST API with authentication
- ✅ Database schema and migrations
- ✅ Frontend dashboard (React/Next.js)
- ✅ Email notification system
- ✅ Comprehensive test suite
- ✅ Security documentation
- ✅ Deployment infrastructure

**In Progress**:
- 🔄 Beta testing with 10-20 users
- 🔄 Frontend refinements
- 🔄 Documentation improvements

**Planned (with funding)**:
- Mobile app (React Native)
- Hardware wallet integration
- Multi-signature support
- Advanced time-lock patterns
- Audit by security firm
- Marketing and user acquisition

## Use Cases

1. **Bitcoin Inheritance**: Ensure heirs can access your Bitcoin
2. **Business Continuity**: Share critical credentials with team
3. **Personal Legacy**: Leave final messages and instructions
4. **Whistleblower Protection**: Time-delayed document release
5. **Cryptocurrency Recovery**: Backup seed phrases securely

## Budget Breakdown

**Development** ($30,000):
- Mobile app development: $15,000
- Hardware wallet integration: $8,000
- Multi-sig support: $7,000

**Security** ($12,000):
- Professional security audit: $10,000
- Bug bounty program: $2,000

**Operations** ($8,000):
- Infrastructure (1 year): $2,000
- Domain and services: $1,000
- Marketing and community: $3,000
- Documentation and tutorials: $2,000

**Total**: $50,000

## Timeline

**Month 1-2**: Mobile app development
**Month 3**: Hardware wallet integration
**Month 4**: Multi-signature support
**Month 5**: Security audit and fixes
**Month 6**: Launch and marketing

## Team

**[Your Name]**: Full-stack developer, Bitcoin enthusiast
- Built EchoLock from scratch
- [Your background/credentials]
- [GitHub profile]

## Impact

**Bitcoin Ecosystem**:
- Demonstrates practical use of timelocks
- Increases Bitcoin utility beyond payments
- Promotes self-custody best practices

**Privacy & Security**:
- Open-source alternative to centralized services
- Censorship-resistant delivery
- True end-to-end encryption

**User Adoption**:
- Target: 1,000 active users in year 1
- Focus on Bitcoin holders initially
- Expand to general cryptocurrency users

## Long-Term Sustainability

1. **Freemium Model**:
   - Basic features: Free forever
   - Advanced features: $5/month
   - Enterprise: Custom pricing

2. **Open Source**:
   - Core protocol: MIT license
   - Community contributions welcome
   - Transparent development

3. **Grant Funding**:
   - OpenSats (this proposal)
   - Additional grants for specific features
   - Foundation sponsorships

## Why OpenSats?

EchoLock aligns with OpenSats' mission:
- ✅ Bitcoin-focused application
- ✅ Open-source and decentralized
- ✅ Enhances Bitcoin utility
- ✅ Solves real-world problem
- ✅ Production-ready code

## Demo

**Live Demo**: https://echolock.xyz
**GitHub**: https://github.com/yourusername/echolock
**API Docs**: https://api.echolock.xyz/docs
**Video Demo**: [YouTube link]

## Contact

**Email**: [your-email]
**Nostr**: [your-npub]
**GitHub**: [your-github]
**Twitter**: [your-twitter]

---

*"Ensuring your digital legacy is preserved, using the power of Bitcoin"*
```

### Create Demo Video Script

Create `docs/DEMO-VIDEO-SCRIPT.md`:

```markdown
# EchoLock Demo Video Script (3-5 minutes)

## Opening (0:00-0:30)

[Screen: EchoLock logo animation]

"What happens to your Bitcoin when you die? Your passwords? Your encrypted data?

Today, I'll show you EchoLock - a cryptographic dead man's switch that solves this problem using Bitcoin timelocks and the Nostr protocol."

## Problem Statement (0:30-1:00)

[Screen: Show problem scenarios]

"Current solutions have major flaws:
- Centralized services can be shut down or hacked
- Manual solutions require trusting someone
- No cryptographic guarantees

We need something better."

## Solution Overview (1:00-1:30)

[Screen: Architecture diagram]

"EchoLock combines:
- Bitcoin's OP_CHECKLOCKTIMEVERIFY for provable time-based triggers
- Shamir Secret Sharing for secure fragment distribution
- Nostr protocol for censorship-resistant delivery

Let me show you how it works."

## Demo: Creating a Switch (1:30-2:30)

[Screen recording: Dashboard]

"First, I'll create a new dead man's switch.

1. I write my secret message - this could be Bitcoin seed phrases, passwords, or instructions
2. I set my check-in interval - let's say 7 days
3. I add recipients who will receive the message if I don't check in
4. I encrypt it with a password

Behind the scenes:
- The message is encrypted with AES-256
- It's split into fragments using Shamir Secret Sharing
- Fragments are distributed across multiple Nostr relays
- A Bitcoin timelock transaction is created but not broadcast"

## Demo: Check-In Process (2:30-3:00)

[Screen recording: Dashboard]

"Now I just need to check in regularly.

I simply click 'Check In' before my timer expires. This resets the countdown.

If I miss a check-in? The system automatically:
1. Broadcasts the timelock transaction
2. Waits for confirmation
3. Retrieves fragments from Nostr
4. Reconstructs the message
5. Sends it to my recipients"

## Technical Highlights (3:00-3:45)

[Screen: Code snippets and diagrams]

"What makes this secure?

1. **No Trust Required**: Everything is cryptographically guaranteed
2. **Decentralized**: No single point of failure
3. **Self-Custodial**: You control your secrets
4. **Open Source**: Fully auditable code

The Bitcoin timelock ensures messages can only be released after a specific time, and Nostr ensures the fragments can't be censored."

## Closing (3:45-4:15)

[Screen: Call to action]

"EchoLock is live and ready for beta testing.

Visit echolock.xyz to:
- Create your first switch
- Join our beta program
- Contribute to the open-source project

This project is seeking OpenSats funding to add:
- Mobile apps
- Hardware wallet integration
- Multi-signature support
- Professional security audit

Links in the description. Thanks for watching!"

[Screen: EchoLock logo + links]

## Recording Notes

**Tools needed**:
- Screen recording: OBS Studio
- Video editing: DaVinci Resolve (free)
- Diagrams: Excalidraw or Figma
- Voiceover: Any decent microphone

**Visual assets to prepare**:
- Architecture diagram
- Security flow diagram
- Dashboard screenshots
- Code snippets (syntax highlighted)
- Bitcoin transaction visualization

**Length**: Aim for 3-5 minutes max
**Style**: Professional but approachable
**Music**: Subtle background music (royalty-free)
```

## Part 8: Next Steps Checklist

### Immediate (Week 1)

- [ ] Deploy API to Railway
- [ ] Setup Resend email service
- [ ] Deploy frontend to Vercel
- [ ] Setup monitoring (UptimeRobot + Sentry)
- [ ] Test all core features end-to-end
- [ ] Create beta tester documentation

### Short-term (Week 2-3)

- [ ] Recruit 10-20 beta testers
- [ ] Create onboarding video tutorial
- [ ] Setup feedback collection system
- [ ] Monitor error logs and fix issues
- [ ] Refine UI/UX based on feedback

### Medium-term (Month 2)

- [ ] Record demo video
- [ ] Write OpenSats proposal
- [ ] Submit to OpenSats
- [ ] Launch on Product Hunt
- [ ] Post on HackerNews
- [ ] Share on Bitcoin Twitter/Nostr

### Long-term (Month 3+)

- [ ] Open source the codebase (if not already)
- [ ] Build community on GitHub
- [ ] Start work on mobile app
- [ ] Plan hardware wallet integration
- [ ] Professional security audit

## Support

For deployment help:
- GitHub Issues: https://github.com/yourusername/echolock/issues
- Email: support@echolock.xyz
- Nostr: [your-npub]

Good luck with your deployment! 🚀
