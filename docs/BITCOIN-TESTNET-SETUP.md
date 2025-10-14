# Bitcoin Testnet Infrastructure Setup Guide

## Overview

EchoLock uses Bitcoin testnet for cryptographic proof of timing in dead man's switches. This guide explains how to set up the required infrastructure.

## Prerequisites

- Linux/Ubuntu server (VPS or local)
- 50-100GB free disk space
- 2GB+ RAM
- Root/sudo access

## Option 1: Bitcoin Core Node (Recommended)

### Step 1: Install Bitcoin Core

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl wget gnupg software-properties-common

# Add Bitcoin PPA (for Ubuntu)
sudo add-apt-repository ppa:luke-jr/bitcoincore
sudo apt update

# Install Bitcoin Core
sudo apt install -y bitcoind

# Verify installation
bitcoind --version
```

### Step 2: Configure Bitcoin Core for Testnet

Create configuration file:

```bash
mkdir -p ~/.bitcoin
nano ~/.bitcoin/bitcoin.conf
```

Add this configuration:

```ini
# Network
testnet=1
server=1
daemon=1

# RPC Configuration
rpcuser=echolock_rpc_user
rpcpassword=CHANGE_THIS_TO_SECURE_PASSWORD_123
rpcallowip=127.0.0.1
rpcport=18332

# Connection settings
maxconnections=20
timeout=30000

# Wallet (required for creating transactions)
wallet=echolock
```

**IMPORTANT**: Change `rpcpassword` to a secure random password:
```bash
# Generate secure password
openssl rand -base64 32
```

### Step 3: Start Bitcoin Core

```bash
# Start Bitcoin daemon
bitcoind -testnet -daemon

# Check if it's running
bitcoin-cli -testnet getblockchaininfo

# Monitor sync progress (this will take several hours)
tail -f ~/.bitcoin/testnet3/debug.log
```

**Initial sync takes 4-8 hours** depending on connection speed. The testnet blockchain is ~30GB.

### Step 4: Create Wallet

```bash
# Create wallet for EchoLock
bitcoin-cli -testnet createwallet "echolock"

# Get a testnet address for funding
bitcoin-cli -testnet getnewaddress
```

### Step 5: Fund Your Wallet

Get testnet Bitcoin (tBTC) from faucets:
- https://testnet-faucet.mempool.co/
- https://bitcoinfaucet.uo1.net/
- https://coinfaucet.eu/en/btc-testnet/

Send 0.01 tBTC to your address.

### Step 6: Configure EchoLock

Update your `.env` file:

```bash
# Enable Bitcoin timelock
USE_BITCOIN_TIMELOCK=true

# Bitcoin Core RPC connection
BITCOIN_RPC_URL=http://127.0.0.1:18332
BITCOIN_RPC_USER=echolock_rpc_user
BITCOIN_RPC_PASSWORD=your_secure_password_here

# Network
BITCOIN_NETWORK=testnet
```

### Step 7: Test Connection

```bash
# From your EchoLock directory
node -e "
import('./src/bitcoin/testnetClient.js').then(async (client) => {
  const height = await client.getCurrentBlockHeight();
  console.log('Current testnet block height:', height);
  process.exit(0);
});
"
```

---

## Option 2: Docker Bitcoin Core (Easier Setup)

Use Docker for easier deployment:

```bash
# Pull Bitcoin Core image
docker pull kylemanna/bitcoind

# Run testnet node
docker run -d \
  --name bitcoin-testnet \
  -v bitcoin-data:/bitcoin/.bitcoin \
  -p 18332:18332 \
  -p 18333:18333 \
  kylemanna/bitcoind \
  -testnet=1 \
  -server=1 \
  -rpcuser=echolock_rpc_user \
  -rpcpassword=CHANGE_THIS_PASSWORD \
  -rpcallowip=172.17.0.0/16 \
  -rpcbind=0.0.0.0

# Check logs
docker logs -f bitcoin-testnet

# Execute commands
docker exec bitcoin-testnet bitcoin-cli -testnet getblockchaininfo
```

---

## Option 3: Hosted Bitcoin Node Services

Use a managed Bitcoin node provider:

### BlockCypher (Free Tier)
- REST API
- No node management
- Limited to 200 req/hour
- URL: https://api.blockcypher.com/v1/btc/test3

### GetBlock (Paid)
- Starting at $49/month
- Full testnet RPC access
- High reliability
- URL: https://getblock.io/

### QuickNode (Paid)
- Starting at $9/month
- Testnet support
- Good performance
- URL: https://www.quicknode.com/

---

## Option 4: Railway/Render Deployment

Deploy Bitcoin Core on your hosting platform:

### Railway Template

Create `railway.toml`:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile.bitcoin"

[deploy]
startCommand = "bitcoind -testnet -daemon && tail -f ~/.bitcoin/testnet3/debug.log"
healthcheckPath = "/"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
```

Create `Dockerfile.bitcoin`:

```dockerfile
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    software-properties-common \
    && add-apt-repository ppa:luke-jr/bitcoincore \
    && apt-get update \
    && apt-get install -y bitcoind \
    && apt-get clean

COPY bitcoin.conf /root/.bitcoin/bitcoin.conf

EXPOSE 18332 18333

CMD ["bitcoind", "-testnet", "-server=1", "-daemon=0"]
```

---

## Monitoring & Maintenance

### Check Node Status

```bash
# Get blockchain info
bitcoin-cli -testnet getblockchaininfo

# Check sync progress
bitcoin-cli -testnet getblockcount

# View mempool
bitcoin-cli -testnet getmempoolinfo

# Check wallet balance
bitcoin-cli -testnet getbalance
```

### Logs

```bash
# View debug log
tail -f ~/.bitcoin/testnet3/debug.log

# View RPC log
tail -f ~/.bitcoin/testnet3/debug.log | grep "rpc"
```

### Backup

```bash
# Backup wallet
bitcoin-cli -testnet backupwallet /path/to/backup/wallet.dat

# Or copy wallet file
cp ~/.bitcoin/testnet3/wallets/echolock/wallet.dat ~/backup/
```

---

## Security Considerations

1. **RPC Password**: Use a strong, random password (32+ characters)
2. **Firewall**: Only expose RPC port to localhost or trusted IPs
3. **Wallet Encryption**: Encrypt your wallet with a passphrase
4. **Backup**: Regularly backup wallet.dat file
5. **Network**: Never use mainnet for testing

### Secure Your Node

```bash
# Encrypt wallet
bitcoin-cli -testnet encryptwallet "your_secure_passphrase"

# Firewall rules (Ubuntu/UFW)
sudo ufw allow 18333/tcp  # Testnet P2P
sudo ufw deny 18332/tcp   # Deny external RPC access
sudo ufw enable
```

---

## Cost Estimates

### Self-Hosted (VPS)

| Provider | Plan | Storage | RAM | Cost |
|----------|------|---------|-----|------|
| DigitalOcean | Droplet | 100GB SSD | 2GB | $12/mo |
| Linode | Nanode | 80GB | 2GB | $10/mo |
| Hetzner | CX21 | 80GB | 4GB | €5/mo |
| Vultr | Cloud Compute | 100GB | 2GB | $12/mo |

**Recommended**: Hetzner CX21 (best value)

### Managed Services

| Provider | Cost | Limits |
|----------|------|--------|
| BlockCypher | Free | 200 req/hr |
| GetBlock | $49/mo | Unlimited |
| QuickNode | $9/mo | 5M API calls/mo |
| NOWNodes | $20/mo | Unlimited |

---

## EchoLock Integration

Once your node is running, update `src/bitcoin/testnetClient.js` if needed:

```javascript
// Current implementation uses environment variables
const RPC_URL = process.env.BITCOIN_RPC_URL || 'http://localhost:18332';
const RPC_USER = process.env.BITCOIN_RPC_USER;
const RPC_PASSWORD = process.env.BITCOIN_RPC_PASSWORD;
```

Enable in `.env`:

```bash
USE_BITCOIN_TIMELOCK=true
BITCOIN_NETWORK=testnet
BITCOIN_RPC_URL=http://localhost:18332
BITCOIN_RPC_USER=echolock_rpc_user
BITCOIN_RPC_PASSWORD=your_password_here
```

Test with CLI demo:

```bash
npm run demo -- --bitcoin
```

---

## Troubleshooting

### Node won't sync
- Check internet connection
- Verify firewall allows port 18333
- Check disk space: `df -h`
- View logs: `tail -f ~/.bitcoin/testnet3/debug.log`

### RPC connection refused
- Check bitcoin.conf has correct rpcuser/rpcpassword
- Verify bitcoind is running: `ps aux | grep bitcoind`
- Test with: `bitcoin-cli -testnet getblockchaininfo`

### Out of testnet funds
- Use multiple faucets
- Request larger amounts (some give 0.01-0.1 tBTC)
- Wait 24 hours between requests

### Slow sync
- Normal for first sync (4-8 hours)
- Use `-dbcache=2000` for faster sync (requires more RAM)
- Consider downloading bootstrap.dat

---

## Production Readiness Checklist

- [ ] Bitcoin Core node fully synced
- [ ] Wallet created and funded with testnet BTC
- [ ] RPC credentials configured securely
- [ ] Firewall rules in place
- [ ] Wallet backup created
- [ ] Test transaction successful
- [ ] EchoLock integration tested
- [ ] Monitoring/alerting configured
- [ ] Documentation updated with actual endpoints

---

## Next Steps

After testnet setup:
1. Test creating a timelock transaction
2. Monitor for 6 blocks (~1 hour) confirmation
3. Test spending after timelock expires
4. Integrate with EchoLock switch creation flow
5. Add error handling for node failures
6. Plan mainnet migration strategy (after security audit)

---

## Support

- Bitcoin Core docs: https://bitcoin.org/en/bitcoin-core/
- Testnet explorer: https://blockstream.info/testnet/
- EchoLock issues: https://github.com/yourusername/echolock/issues
