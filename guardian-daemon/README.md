# EchoLock Guardian Daemon

A standalone service that monitors Nostr heartbeats and releases Shamir shares when a user's dead man's switch expires.

## Overview

The Guardian Daemon is part of the EchoLock decentralized dead man's switch system. It:

1. **Watches for enrollments** - When a user distributes their Shamir shares, guardians receive encrypted shares via Nostr (kind 30079)
2. **Monitors heartbeats** - Tracks user heartbeat events (kind 30078) on Nostr relays
3. **Releases shares** - When a heartbeat hasn't been seen for the configured threshold + grace period, publishes the share for recipients (kind 30080)

## Quick Start

```bash
# Install dependencies
npm install

# Generate a new keypair
node index.js --generate-keys

# Copy and configure
cp guardian.example.json guardian.json
# Edit guardian.json with your keys

# Start the daemon
node index.js
```

## Configuration

Create a `guardian.json` file:

```json
{
  "privateKey": "<64-char hex Nostr private key>",
  "relayUrls": [
    "wss://relay.damus.io",
    "wss://relay.nostr.band",
    "wss://nos.lol"
  ],
  "checkIntervalMinutes": 5,
  "gracePeriodHours": 1,
  "dataDir": "./data",
  "webhookUrl": null
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `privateKey` | Your Nostr private key (required) | - |
| `publicKey` | Your Nostr public key (auto-derived if not set) | - |
| `relayUrls` | Nostr relays to connect to | 5 default relays |
| `checkIntervalMinutes` | How often to check for expired switches | 5 |
| `gracePeriodHours` | Extra time after threshold before release | 1 |
| `dataDir` | Where to persist switch data | `./data` |
| `webhookUrl` | Optional webhook for notifications | null |

## How It Works

### 1. Enrollment

When a user creates a switch and distributes shares:

```
User → Nostr (kind 30079) → Guardian sees event → Stores encrypted share
                         → Guardian publishes ACK (kind 30083)
```

### 2. Monitoring

```
User → Nostr (kind 30078, heartbeat) → Guardian updates lastHeartbeatSeen
```

### 3. Release

When `currentTime > lastHeartbeat + thresholdHours + gracePeriodHours`:

```
Guardian → Decrypts share → Re-encrypts for recipients → Nostr (kind 30080)
```

## Nostr Event Kinds

| Kind | Purpose | Publisher |
|------|---------|-----------|
| 30078 | Heartbeat | User |
| 30079 | Encrypted share storage | User |
| 30080 | Share release | Guardian |
| 30083 | Guardian acknowledgment | Guardian |

## Self-Hosting

Anyone can run a guardian daemon. The system is designed so that:

- Users choose their own guardians (friends, family, lawyers, services)
- A 3-of-5 threshold means any 3 guardians can release
- No single guardian can release alone
- EchoLock's guardian is just one option, not required

## Security

- **Private keys stay local** - The daemon only holds its own Nostr key
- **NIP-44 encryption** - Shares are encrypted end-to-end
- **Persistence** - Switch data survives daemon restarts
- **No central dependency** - Works with any Nostr relays

## Webhook Notifications

If `webhookUrl` is configured, the daemon sends POST requests on events:

```json
{
  "type": "share_released",
  "switchId": "abc123...",
  "shareIndex": 1,
  "eventId": "event123...",
  "timestamp": 1234567890
}
```

## Running as a Service

### systemd (Linux)

```ini
[Unit]
Description=EchoLock Guardian Daemon
After=network.target

[Service]
Type=simple
User=guardian
WorkingDirectory=/opt/echolock-guardian
ExecStart=/usr/bin/node index.js --config guardian.json
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["node", "index.js"]
```

## License

MIT
