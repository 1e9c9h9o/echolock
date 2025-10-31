#!/bin/bash

# EchoLock Production Deployment Script
# This script automates deployment to Railway

set -e

echo "🚀 EchoLock Production Deployment"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
  echo -e "${RED}❌ Railway CLI not found${NC}"
  echo "Installing Railway CLI..."
  npm install -g @railway/cli
  echo -e "${GREEN}✓ Railway CLI installed${NC}"
fi

echo -e "${GREEN}✓ Railway CLI found${NC}"
echo ""

# Check authentication
echo -e "${BLUE}Checking Railway authentication...${NC}"
if ! railway whoami &> /dev/null; then
  echo -e "${YELLOW}⚠ Not authenticated with Railway${NC}"
  echo "Opening browser for login..."
  railway login

  # Verify login worked
  if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Authentication failed${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}✓ Authenticated with Railway${NC}"
echo ""

# Check if project is linked
echo -e "${BLUE}Checking project...${NC}"
if [ ! -d ".railway" ]; then
  echo -e "${YELLOW}⚠ No Railway project linked${NC}"
  echo ""
  echo "Choose an option:"
  echo "1) Create new project"
  echo "2) Link existing project"
  read -p "Enter choice (1 or 2): " choice

  if [ "$choice" == "1" ]; then
    echo "Creating new Railway project..."
    railway init
  else
    echo "Linking existing project..."
    railway link
  fi
fi

echo -e "${GREEN}✓ Project configured${NC}"
echo ""

# Check for PostgreSQL
echo -e "${BLUE}Checking for PostgreSQL database...${NC}"
if ! railway variables | grep -q "DATABASE_URL"; then
  echo -e "${YELLOW}⚠ No DATABASE_URL found${NC}"
  echo "Adding PostgreSQL database..."
  railway add -d postgresql
  echo -e "${GREEN}✓ PostgreSQL added${NC}"
else
  echo -e "${GREEN}✓ Database already configured${NC}"
fi
echo ""

# Set environment variables
echo -e "${BLUE}Setting environment variables...${NC}"
echo "This will use the values from .env.production"
echo ""

# Read .env.production and set variables
if [ -f ".env.production" ]; then
  # JWT Secret
  JWT_SECRET=$(grep "^JWT_SECRET=" .env.production | cut -d'=' -f2-)
  railway variables set JWT_SECRET="$JWT_SECRET"

  # Service Encryption Key
  SERVICE_ENCRYPTION_KEY=$(grep "^SERVICE_ENCRYPTION_KEY=" .env.production | cut -d'=' -f2-)
  railway variables set SERVICE_ENCRYPTION_KEY="$SERVICE_ENCRYPTION_KEY"

  # Frontend URL
  FRONTEND_URL=$(grep "^FRONTEND_URL=" .env.production | cut -d'=' -f2-)
  railway variables set FRONTEND_URL="$FRONTEND_URL"

  # CORS Origins
  CORS_ORIGINS=$(grep "^CORS_ORIGINS=" .env.production | cut -d'=' -f2-)
  railway variables set CORS_ORIGINS="$CORS_ORIGINS"

  # FROM_EMAIL
  FROM_EMAIL=$(grep "^FROM_EMAIL=" .env.production | cut -d'=' -f2-)
  railway variables set FROM_EMAIL="$FROM_EMAIL"

  # NODE_ENV
  railway variables set NODE_ENV="production"

  # Nostr Relays
  NOSTR_RELAYS=$(grep "^NOSTR_RELAYS=" .env.production | cut -d'=' -f2-)
  railway variables set NOSTR_RELAYS="$NOSTR_RELAYS"

  echo -e "${GREEN}✓ Environment variables set${NC}"
else
  echo -e "${RED}❌ .env.production not found${NC}"
  exit 1
fi

# Check for RESEND_API_KEY
echo ""
echo -e "${YELLOW}⚠ RESEND_API_KEY needs to be set manually${NC}"
echo "Get your API key from: https://resend.com"
read -p "Enter your Resend API key (or press Enter to skip): " resend_key

if [ ! -z "$resend_key" ]; then
  railway variables set RESEND_API_KEY="$resend_key"
  echo -e "${GREEN}✓ RESEND_API_KEY set${NC}"
else
  echo -e "${YELLOW}⚠ Skipping RESEND_API_KEY (emails won't work)${NC}"
fi

echo ""

# Deploy
echo -e "${BLUE}Deploying to Railway...${NC}"
railway up

echo ""
echo -e "${GREEN}✓ Deployment initiated!${NC}"
echo ""

# Wait for deployment
echo "Waiting for deployment to complete..."
sleep 10

# Run migrations
echo ""
echo -e "${BLUE}Running database migrations...${NC}"
railway run npm run db:migrate

echo -e "${GREEN}✓ Migrations complete${NC}"
echo ""

# Seed demo user
echo -e "${BLUE}Seeding demo user...${NC}"
railway run psql \$DATABASE_URL -f src/api/db/seed-demo-user.sql

echo -e "${GREEN}✓ Demo user seeded${NC}"
echo ""

# Get domain
echo -e "${BLUE}Getting Railway domain...${NC}"
RAILWAY_DOMAIN=$(railway domain 2>/dev/null || echo "")

if [ ! -z "$RAILWAY_DOMAIN" ]; then
  echo -e "${GREEN}✓ Domain: $RAILWAY_DOMAIN${NC}"
else
  echo -e "${YELLOW}⚠ Generating domain...${NC}"
  railway domain
  RAILWAY_DOMAIN=$(railway domain 2>/dev/null || echo "unknown")
fi

echo ""
echo "=================================="
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "=================================="
echo ""
echo "Your API is deployed at:"
echo -e "${BLUE}https://$RAILWAY_DOMAIN${NC}"
echo ""
echo "Next steps:"
echo "1. Test health endpoint:"
echo -e "   ${YELLOW}curl https://$RAILWAY_DOMAIN/health${NC}"
echo ""
echo "2. Configure custom domain in Railway dashboard:"
echo "   - Go to: https://railway.app/dashboard"
echo "   - Add domain: api.echolock.xyz"
echo "   - Add DNS CNAME record:"
echo -e "     ${YELLOW}Name: api${NC}"
echo -e "     ${YELLOW}Value: $RAILWAY_DOMAIN${NC}"
echo ""
echo "3. Test login with demo user:"
echo "   Email: demo@echolock.xyz"
echo "   Password: DemoPass123"
echo ""
echo "4. Once DNS propagates, test:"
echo -e "   ${YELLOW}curl https://api.echolock.xyz/health${NC}"
echo ""
echo "=================================="
