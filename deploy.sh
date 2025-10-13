#!/bin/bash

# EchoLock Deployment Script
# This script helps deploy EchoLock API to various platforms

set -e

echo "🚀 EchoLock Deployment Helper"
echo "=============================="
echo ""

# Check if platform is specified
if [ -z "$1" ]; then
  echo "Usage: ./deploy.sh [platform]"
  echo ""
  echo "Available platforms:"
  echo "  railway    - Deploy to Railway.app"
  echo "  render     - Deploy to Render.com"
  echo "  fly        - Deploy to Fly.io"
  echo "  test       - Test local deployment"
  echo ""
  exit 1
fi

PLATFORM=$1

case $PLATFORM in
  railway)
    echo "📦 Deploying to Railway.app..."
    echo ""

    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
      echo "❌ Railway CLI not found. Installing..."
      npm install -g @railway/cli
    fi

    echo "✓ Railway CLI installed"
    echo ""

    # Login check
    echo "Checking Railway authentication..."
    if ! railway whoami &> /dev/null; then
      echo "Please login to Railway:"
      railway login
    fi

    echo "✓ Authenticated"
    echo ""

    # Initialize if needed
    if [ ! -f "railway.toml" ]; then
      echo "Initializing Railway project..."
      railway init
    fi

    echo "✓ Project initialized"
    echo ""

    # Check for PostgreSQL
    echo "Checking for PostgreSQL database..."
    echo "If you don't have a database yet, run: railway add postgresql"
    echo ""

    # Set environment variables
    echo "Setting environment variables..."
    echo "You'll need to set these manually in Railway dashboard:"
    echo "  - RESEND_API_KEY (from resend.com)"
    echo "  - JWT_SECRET (use: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\")"
    echo "  - SERVICE_ENCRYPTION_KEY (use: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
    echo ""

    read -p "Have you set these variables in Railway dashboard? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Please set the variables first, then run this script again."
      exit 1
    fi

    # Deploy
    echo ""
    echo "Deploying to Railway..."
    railway up

    echo ""
    echo "✓ Deployment complete!"
    echo ""
    echo "Next steps:"
    echo "1. Run database migrations: railway run npm run db:migrate"
    echo "2. Generate a domain in Railway dashboard"
    echo "3. Test your API: curl https://your-domain.railway.app/health"
    ;;

  render)
    echo "📦 Deploying to Render.com..."
    echo ""
    echo "Render deployment is done via their dashboard:"
    echo ""
    echo "1. Go to https://render.com"
    echo "2. New → Web Service"
    echo "3. Connect your GitHub repository"
    echo "4. Use these settings:"
    echo "   - Build Command: npm install"
    echo "   - Start Command: npm run api"
    echo "   - Add PostgreSQL database"
    echo "5. Set environment variables (see .env.production.template)"
    echo "6. Deploy!"
    echo ""
    echo "render.yaml file has been created for automatic deployment"
    ;;

  fly)
    echo "📦 Deploying to Fly.io..."
    echo ""

    # Check if Fly CLI is installed
    if ! command -v fly &> /dev/null; then
      echo "❌ Fly CLI not found. Installing..."
      curl -L https://fly.io/install.sh | sh
      echo "Please restart your terminal and run this script again."
      exit 1
    fi

    echo "✓ Fly CLI installed"
    echo ""

    # Login check
    echo "Checking Fly authentication..."
    if ! fly auth whoami &> /dev/null; then
      echo "Please login to Fly:"
      fly auth login
    fi

    echo "✓ Authenticated"
    echo ""

    # Launch
    echo "Launching app..."
    fly launch

    echo ""
    echo "Setting up PostgreSQL..."
    echo "Run: fly postgres create"
    echo "Then: fly postgres attach <postgres-app-name>"
    echo ""
    echo "Set secrets:"
    echo "fly secrets set JWT_SECRET=\$(node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\")"
    echo "fly secrets set SERVICE_ENCRYPTION_KEY=\$(node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
    echo "fly secrets set RESEND_API_KEY=re_your_key"
    ;;

  test)
    echo "🧪 Testing local deployment..."
    echo ""

    # Check .env file
    if [ ! -f ".env" ]; then
      echo "❌ .env file not found"
      echo "Copy .env.example to .env and fill in the values"
      exit 1
    fi

    echo "✓ .env file found"
    echo ""

    # Check Node version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
      echo "❌ Node.js version must be 18 or higher"
      exit 1
    fi

    echo "✓ Node.js version: $(node -v)"
    echo ""

    # Install dependencies
    echo "Installing dependencies..."
    npm install

    echo "✓ Dependencies installed"
    echo ""

    # Check database connection
    echo "Checking database connection..."
    if ! psql $DATABASE_URL -c "SELECT 1" &> /dev/null; then
      echo "❌ Database connection failed"
      echo "Make sure PostgreSQL is running and DATABASE_URL is correct"
      exit 1
    fi

    echo "✓ Database connected"
    echo ""

    # Run migrations
    echo "Running database migrations..."
    npm run db:migrate

    echo "✓ Migrations complete"
    echo ""

    # Start server
    echo "Starting server..."
    echo "API will be available at http://localhost:3000"
    echo ""
    npm run api
    ;;

  *)
    echo "❌ Unknown platform: $PLATFORM"
    echo "Available platforms: railway, render, fly, test"
    exit 1
    ;;
esac
