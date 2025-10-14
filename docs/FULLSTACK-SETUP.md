# EchoLock Full Stack Setup Guide

Complete guide to get both frontend and backend running together.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL (or Docker for PostgreSQL)
- Git

---

## 🚀 Complete Setup (15 minutes)

### Step 1: Clone and Install

```bash
# Clone repository
git clone https://github.com/Sandford28/echolock.git
cd echolock

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Setup PostgreSQL Database

**For WSL2/Linux:**

```bash
# Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start service
sudo service postgresql start

# Set postgres password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

# Create database
sudo -u postgres createdb echolock

# Initialize schema
sudo -u postgres psql -d echolock -f src/api/db/schema.sql
```

**For Docker:**

```bash
# Run PostgreSQL container
docker run --name echolock-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=echolock \
  -p 5432:5432 \
  -d postgres:14

# Wait for container to start
sleep 3

# Initialize schema
docker exec -i echolock-db psql -U postgres -d echolock < src/api/db/schema.sql
```

**For macOS:**

```bash
# Install via Homebrew
brew install postgresql@14
brew services start postgresql@14

# Create database and initialize
createdb echolock
psql -d echolock -f src/api/db/schema.sql
```

### Step 3: Configure Backend Environment

```bash
# Copy example env file
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=echolock
DB_USER=postgres
DB_PASSWORD=postgres

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:3001

# Generate secure keys (run these commands)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
SERVICE_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Email Configuration (optional for development)
RESEND_API_KEY=re_your_key_here
FROM_EMAIL=EchoLock <noreply@echolock.xyz>

# Development Settings
SKIP_EMAIL_VERIFICATION=true
MOCK_EMAIL_SERVICE=true
LOG_LEVEL=info
LOG_FORMAT=pretty

# CORS
CORS_ORIGINS=http://localhost:3001

# Nostr Relays (comma-separated)
NOSTR_RELAYS=wss://relay.damus.io,wss://nos.lol,wss://relay.nostr.band,wss://nostr.wine
```

### Step 4: Configure Frontend Environment

```bash
# Navigate to frontend directory
cd frontend

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local

# Return to project root
cd ..
```

### Step 5: Start Both Servers

**Terminal 1 - Backend API:**

```bash
npm run api
```

You should see:
```
🚀 EchoLock API server started
📡 API available at http://localhost:3000/api
❤️  Health check at http://localhost:3000/health
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

You should see:
```
▲ Next.js 14.2.33
- Local:        http://localhost:3001
✓ Ready in 9.2s
```

---

## ✅ Verify Everything Works

### 1. Test Backend Health

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-13T17:30:00.000Z"
}
```

### 2. Create Test User via API

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

### 3. Verify user in database and mark as verified

```bash
# Mark email as verified (since we're using mock email)
PGPASSWORD=postgres psql -U postgres -h localhost -d echolock -c \
  "UPDATE users SET email_verified = true WHERE email = 'test@example.com';"
```

### 4. Test Login via API

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

You should receive JWT tokens in the response.

### 5. Test Frontend

Open http://localhost:3001 in your browser and:

1. Log in with test@example.com / TestPassword123
2. Navigate to dashboard
3. Try creating a switch
4. Check settings page

---

## 📁 Project Structure

```
echolock/
├── src/api/               # Backend API
│   ├── server.js         # Express server
│   ├── db/               # Database
│   │   ├── connection.js # PostgreSQL pool
│   │   └── schema.sql    # Database schema
│   ├── routes/           # API routes
│   │   ├── auth.js       # Authentication
│   │   ├── switches.js   # Switch management
│   │   └── users.js      # User management
│   ├── services/         # Business logic
│   ├── middleware/       # Auth, validation
│   ├── utils/            # Utilities
│   └── jobs/             # Background jobs
├── frontend/             # Next.js frontend
│   ├── app/             # App router pages
│   │   ├── auth/        # Auth pages
│   │   └── dashboard/   # Dashboard pages
│   ├── components/      # React components
│   ├── lib/             # API client, utilities
│   └── public/          # Static assets
├── .env                 # Backend config (create from .env.example)
└── frontend/.env.local  # Frontend config
```

---

## 🔌 API Endpoints

Base URL: `http://localhost:3000/api`

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request reset
- `POST /api/auth/reset-password` - Reset password

### Switches (Requires Auth)
- `POST /api/switches` - Create switch
- `GET /api/switches` - List switches
- `GET /api/switches/:id` - Get switch details
- `POST /api/switches/:id/checkin` - Check-in
- `PATCH /api/switches/:id` - Update switch
- `DELETE /api/switches/:id` - Delete switch

### Users (Requires Auth)
- `GET /api/users/me` - Get profile
- `PATCH /api/users/me` - Update profile
- `DELETE /api/users/me` - Delete account

---

## 🛠️ Development Commands

### Backend

```bash
# Start backend (production mode)
npm run api

# Run tests
npm test

# Database query
PGPASSWORD=postgres psql -U postgres -h localhost -d echolock
```

### Frontend

```bash
# Start frontend
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Lint
cd frontend && npm run lint
```

---

## 🐛 Troubleshooting

### Backend won't start - Database connection failed

**Check PostgreSQL is running:**
```bash
# Linux/WSL2
sudo service postgresql status

# macOS
brew services list | grep postgresql

# Docker
docker ps | grep echolock-db
```

**Test database connection manually:**
```bash
PGPASSWORD=postgres psql -U postgres -h localhost -d echolock -c "SELECT 1"
```

**Check environment variables:**
```bash
# Make sure .env exists and has correct values
cat .env | grep DB_
```

### Frontend can't connect to backend

**Check backend is running:**
```bash
curl http://localhost:3000/health
```

**Check frontend .env.local:**
```bash
cat frontend/.env.local
# Should contain: NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Check browser console for CORS errors:**
- Open DevTools (F12)
- Check Console tab
- Look for CORS or network errors

### Port already in use

**Backend (port 3000):**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
lsof -ti:3000 | xargs kill

# Or change port in .env
PORT=3001
```

**Frontend (port 3001):**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill
```

### Module not found errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json .next
npm install
cd ..
```

### Database schema errors

```bash
# Drop and recreate database
PGPASSWORD=postgres psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS echolock;"
PGPASSWORD=postgres psql -U postgres -h localhost -c "CREATE DATABASE echolock;"
PGPASSWORD=postgres psql -U postgres -h localhost -d echolock -f src/api/db/schema.sql
```

---

## 🔒 Security Notes

### Development
- Using `SKIP_EMAIL_VERIFICATION=true` bypasses email verification
- Using `MOCK_EMAIL_SERVICE=true` logs emails instead of sending
- Default postgres password is for local development only

### Production
- Generate strong JWT_SECRET and SERVICE_ENCRYPTION_KEY
- Use real Resend API key for emails
- Set SKIP_EMAIL_VERIFICATION=false
- Use secure database credentials
- Enable SSL for PostgreSQL
- Set NODE_ENV=production

---

## 📊 Background Jobs

The backend includes a timer monitor that runs every 5 minutes:

1. Checks for expired switches
2. Retrieves encrypted fragments from Nostr
3. Reconstructs and decrypts messages
4. Sends emails to recipients
5. Updates switch status to RELEASED

View timer logs:
```bash
npm run api | grep "Timer monitor"
```

---

## 🎨 Frontend Features

### Pages
- `/` - Landing page
- `/auth/login` - Login page
- `/auth/signup` - Signup page
- `/auth/forgot-password` - Password reset request
- `/auth/reset-password` - Password reset form
- `/auth/verify-email` - Email verification
- `/dashboard` - Main dashboard (switches list)
- `/dashboard/create` - Create new switch
- `/dashboard/switches/[id]` - Switch details
- `/dashboard/settings` - User settings

### Components
- Authentication forms
- Switch cards and lists
- Check-in interface
- Settings management
- Responsive navigation

---

## 🚀 What's Next?

### Development
1. Test the full authentication flow
2. Create a switch and test check-in
3. Test timer expiration (reduce check-in time)
4. Customize frontend styling
5. Add more features

### Production Deployment
1. Follow [API-DEPLOYMENT-GUIDE.md](./API-DEPLOYMENT-GUIDE.md)
2. Deploy frontend to Vercel
3. Configure custom domain
4. Set up monitoring
5. Configure backups

---

## 📚 Additional Resources

- [API-QUICKSTART.md](./API-QUICKSTART.md) - Backend setup only
- [API-DEPLOYMENT-GUIDE.md](./API-DEPLOYMENT-GUIDE.md) - Production deployment
- [API-IMPLEMENTATION-GUIDE.md](./API-IMPLEMENTATION-GUIDE.md) - Architecture details
- [BACKEND-STATUS.md](./BACKEND-STATUS.md) - Implementation status

---

## ✨ Current Status

**Backend ✅**
- User authentication
- Email verification
- Password reset
- Switch CRUD operations
- Check-in system
- Automatic timer monitoring
- Nostr distribution
- Email notifications

**Frontend ✅**
- Landing page
- Authentication pages
- Dashboard
- Switch management
- Settings page
- API integration
- Responsive design

**Full Stack ✅**
- Backend API running on port 3000
- Frontend running on port 3001
- Database connection configured
- Authentication flow working
- Switch creation and management operational

---

## 🤝 Support

Having issues?

1. Check both server logs
2. Test database connection
3. Verify environment variables
4. Check CORS configuration
5. Review browser console for errors

For more help, see the troubleshooting section above.

---

**You're all set!** Both backend and frontend are connected and working. Visit http://localhost:3001 to start using EchoLock.
