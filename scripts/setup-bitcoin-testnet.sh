#!/bin/bash
#
# Bitcoin Testnet Setup Script for EchoLock
# Automates Bitcoin Core testnet node installation and configuration
#
# Usage: ./scripts/setup-bitcoin-testnet.sh
#

set -e

echo "=========================================="
echo "EchoLock Bitcoin Testnet Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "⚠️  Please do not run this script as root"
  echo "Run as regular user with sudo privileges"
  exit 1
fi

# Check OS
if [ ! -f /etc/os-release ]; then
  echo "❌ Cannot detect OS. This script is for Ubuntu/Debian systems."
  exit 1
fi

source /etc/os-release
if [[ ! "$ID" =~ ^(ubuntu|debian)$ ]]; then
  echo "❌ This script is designed for Ubuntu/Debian. Detected: $ID"
  exit 1
fi

echo "✓ OS detected: $PRETTY_NAME"
echo ""

# Check disk space
AVAILABLE_SPACE=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 60 ]; then
  echo "❌ Insufficient disk space. Need at least 60GB, available: ${AVAILABLE_SPACE}GB"
  exit 1
fi

echo "✓ Disk space check passed: ${AVAILABLE_SPACE}GB available"
echo ""

# Confirm installation
read -p "This will install Bitcoin Core and sync the testnet blockchain (~30GB). Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Installation cancelled."
  exit 0
fi

echo ""
echo "Step 1: Installing dependencies..."
sudo apt update -qq
sudo apt install -y curl wget gnupg software-properties-common

echo ""
echo "Step 2: Adding Bitcoin PPA..."
sudo add-apt-repository -y ppa:luke-jr/bitcoincore
sudo apt update -qq

echo ""
echo "Step 3: Installing Bitcoin Core..."
sudo apt install -y bitcoind

# Verify installation
BITCOIN_VERSION=$(bitcoind --version | head -n1)
echo "✓ Installed: $BITCOIN_VERSION"

echo ""
echo "Step 4: Generating secure RPC credentials..."
RPC_USER="echolock_rpc_user"
RPC_PASSWORD=$(openssl rand -base64 32)

echo ""
echo "Step 5: Creating Bitcoin configuration..."
mkdir -p ~/.bitcoin

cat > ~/.bitcoin/bitcoin.conf << EOF
# EchoLock Bitcoin Testnet Configuration
# Generated: $(date)

# Network
testnet=1
server=1
daemon=1

# RPC Configuration
rpcuser=${RPC_USER}
rpcpassword=${RPC_PASSWORD}
rpcallowip=127.0.0.1
rpcport=18332

# Connection settings
maxconnections=20
timeout=30000

# Performance
dbcache=2000

# Wallet
wallet=echolock
EOF

echo "✓ Configuration created at ~/.bitcoin/bitcoin.conf"

echo ""
echo "Step 6: Starting Bitcoin Core testnet node..."
bitcoind -testnet -daemon

# Wait for Bitcoin to start
sleep 3

echo ""
echo "Step 7: Creating wallet..."
bitcoin-cli -testnet createwallet "echolock" 2>/dev/null || echo "Wallet already exists"

echo ""
echo "Step 8: Getting testnet address..."
ADDRESS=$(bitcoin-cli -testnet getnewaddress)

echo ""
echo "=========================================="
echo "✅ Bitcoin Testnet Setup Complete!"
echo "=========================================="
echo ""
echo "📋 Configuration Details:"
echo "   RPC URL: http://127.0.0.1:18332"
echo "   RPC User: ${RPC_USER}"
echo "   RPC Password: ${RPC_PASSWORD}"
echo ""
echo "💰 Testnet Address (fund this):"
echo "   ${ADDRESS}"
echo ""
echo "🌐 Get testnet Bitcoin from:"
echo "   - https://testnet-faucet.mempool.co/"
echo "   - https://bitcoinfaucet.uo1.net/"
echo "   - https://coinfaucet.eu/en/btc-testnet/"
echo ""
echo "📝 Add these to your .env file:"
echo ""
echo "USE_BITCOIN_TIMELOCK=true"
echo "BITCOIN_RPC_URL=http://127.0.0.1:18332"
echo "BITCOIN_RPC_USER=${RPC_USER}"
echo "BITCOIN_RPC_PASSWORD=${RPC_PASSWORD}"
echo "BITCOIN_NETWORK=testnet"
echo ""
echo "⏳ Initial blockchain sync in progress..."
echo "   This will take 4-8 hours. Monitor with:"
echo "   tail -f ~/.bitcoin/testnet3/debug.log"
echo ""
echo "📊 Check sync status:"
echo "   bitcoin-cli -testnet getblockchaininfo"
echo ""
echo "=========================================="

# Save credentials to file for reference
CREDS_FILE=~/.echolock-bitcoin-credentials.txt
cat > "$CREDS_FILE" << EOF
EchoLock Bitcoin Testnet Credentials
Generated: $(date)

RPC URL: http://127.0.0.1:18332
RPC User: ${RPC_USER}
RPC Password: ${RPC_PASSWORD}
Testnet Address: ${ADDRESS}

Environment Variables:
USE_BITCOIN_TIMELOCK=true
BITCOIN_RPC_URL=http://127.0.0.1:18332
BITCOIN_RPC_USER=${RPC_USER}
BITCOIN_RPC_PASSWORD=${RPC_PASSWORD}
BITCOIN_NETWORK=testnet
EOF

chmod 600 "$CREDS_FILE"
echo "🔒 Credentials saved to: $CREDS_FILE (read-only)"
echo ""
