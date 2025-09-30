# Bitcoin Testnet Integration

## Overview

ECHOLOCK integrates Bitcoin testnet timelocks using `OP_CHECKLOCKTIMEVERIFY` to provide blockchain-enforced time constraints for secret release. This adds a decentralized, censorship-resistant layer to the dead man's switch mechanism.

## Architecture

### Components

**1. Testnet Client** (`src/bitcoin/testnetClient.js`)
- Connects to Blockstream Testnet API (no local node required)
- Creates timelock scripts with OP_CHECKLOCKTIMEVERIFY
- Monitors blockchain height and transaction status
- Estimates fees and provides faucet URLs

**2. Dead Man's Switch Integration** (`src/core/deadManSwitch.js`)
- Creates Bitcoin timelock when creating a switch
- Stores timelock metadata with switch data
- Monitors timelock status via blockchain queries
- Coordinates timer + blockchain verification

**3. Bitcoin Demo** (`src/cli/bitcoinDemo.js`)
- Interactive demonstration of Bitcoin integration
- Shows timelock creation and monitoring
- Explains production deployment requirements

## How It Works

### 1. Timelock Creation

When creating a dead man's switch:

```javascript
const result = await createSwitch(message, 72, true); // 72 hours, Bitcoin enabled
```

**Process:**
1. Calculate target block height based on check-in interval
   - Formula: `currentHeight + (hours * 6)`
   - Example: 72 hours = 432 blocks (~10 min/block)

2. Generate Bitcoin key pair
   - Random EC key pair on secp256k1 curve
   - Public key used in timelock script

3. Create timelock script:
   ```
   <locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP <pubkey> OP_CHECKSIG
   ```

4. Generate P2SH address from script
   - Pay-to-Script-Hash wraps the timelock
   - Funds sent to this address become timelocked

5. Store timelock metadata with switch

### 2. Timelock Script

**Script Structure:**
```
OP_PUSHNUM_<height>      # Push target block height
OP_CHECKLOCKTIMEVERIFY   # Verify block height >= locktime
OP_DROP                  # Remove locktime from stack
<pubkey>                 # Push public key
OP_CHECKSIG              # Verify signature
```

**Security Properties:**
- **Consensus-enforced**: Entire Bitcoin network validates timelock
- **Immutable**: Cannot be changed once published
- **Decentralized**: No single party controls release
- **Transparent**: Anyone can verify timelock status

### 3. Monitoring

**Block Height Monitoring:**
```javascript
const status = await getStatus(switchId, true); // includeBitcoinStatus = true
```

**Status includes:**
- Current blockchain height
- Timelock target height
- Blocks remaining
- Validity status (locked/valid)
- Latest block hash and timestamp

**Live Updates:**
```javascript
const timelockStatus = await getTimelockStatus(locktime);
console.log('Blocks remaining:', timelockStatus.blocksRemaining);
console.log('Is valid:', timelockStatus.isValid);
```

## API Reference

### Testnet Client Functions

#### `getCurrentBlockHeight()`
```javascript
const height = await getCurrentBlockHeight();
// Returns: number (e.g., 2845123)
```

#### `createTimelockTransaction(locktime, publicKey)`
```javascript
const tx = createTimelockTransaction(2845555, publicKeyBuffer);
// Returns: {
//   locktime: 2845555,
//   address: '2N...',
//   script: 'hex...',
//   scriptAsm: 'OP_PUSHNUM...',
//   network: 'testnet',
//   isReady: false
// }
```

#### `getTimelockStatus(locktime)`
```javascript
const status = await getTimelockStatus(2845555);
// Returns: {
//   type: 'block-height',
//   locktime: 2845555,
//   currentHeight: 2845123,
//   blocksRemaining: 432,
//   isValid: false,
//   estimatedTimeRemaining: 259200000, // ms
//   validAfterBlock: 2845555,
//   latestBlock: { height, timestamp, hash },
//   network: 'testnet'
// }
```

#### `getFeeEstimates()`
```javascript
const fees = await getFeeEstimates();
// Returns: {
//   fastest: 20,  // sat/vB
//   halfHour: 15,
//   hour: 10,
//   economy: 5
// }
```

#### `getTestnetFaucets()`
```javascript
const faucets = getTestnetFaucets();
// Returns: ['https://testnet-faucet.mempool.co/', ...]
```

### Dead Man's Switch Functions

#### `createSwitch(message, hours, useBitcoinTimelock)`
```javascript
const result = await createSwitch(
  "Secret message",
  72,    // hours
  true   // enable Bitcoin timelock
);

// Returns: {
//   switchId: 'hex...',
//   expiryTime: timestamp,
//   fragmentCount: 5,
//   requiredFragments: 3,
//   checkInHours: 72,
//   bitcoin: {
//     enabled: true,
//     currentHeight: 2845123,
//     timelockHeight: 2845555,
//     blocksUntilValid: 432,
//     address: '2N...',
//     script: 'hex...',
//     scriptAsm: 'OP_PUSHNUM...',
//     publicKey: 'hex...',
//     status: 'pending'
//   }
// }
```

#### `getStatus(switchId, includeBitcoinStatus)`
```javascript
const status = await getStatus(switchId, true);

// Returns: {
//   found: true,
//   switchId: 'hex...',
//   status: 'ARMED',
//   timeRemaining: ms,
//   bitcoin: {
//     enabled: true,
//     currentHeight: 2845200,
//     timelockHeight: 2845555,
//     blocksRemaining: 355,
//     isValid: false,
//     latestBlock: { ... }
//   }
// }
```

## Bitcoin Concepts

### OP_CHECKLOCKTIMEVERIFY (OP_CLTV)

**Purpose:** Prevents a transaction from being mined before a specific time

**How it works:**
1. Script contains `<locktime> OP_CHECKLOCKTIMEVERIFY`
2. Transaction includes `nLockTime` field matching `<locktime>`
3. When spending:
   - If `locktime < 500,000,000`: interpreted as block height
   - If `locktime >= 500,000,000`: interpreted as Unix timestamp
4. Validation fails if current block height/time < locktime

**Bitcoin Improvement Proposal:** [BIP 65](https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki)

### Median Time Past (MTP)

**Challenge:** Block timestamps can vary

**Bitcoin's Solution:** Use median of last 11 blocks
- Prevents manipulation of block times
- Creates ~2 hour uncertainty window
- Timelocks use MTP, not current time

**Impact on ECHOLOCK:**
- Add safety margin to timelock calculations
- User-facing timer should account for MTP lag
- Actual release may occur 1-2 hours after target time

### Pay-to-Script-Hash (P2SH)

**Purpose:** Hide complex scripts behind simple addresses

**Process:**
1. Create timelock script
2. Hash script: `scriptHash = HASH160(script)`
3. Create address: `address = Base58Check(version + scriptHash)`
4. To spend: provide original script + signatures

**Benefits:**
- Standard address format (starts with '2' on testnet)
- Hides script complexity from sender
- Reduces transaction size until redemption

## Integration Examples

### Example 1: Create Switch with Bitcoin Timelock

```javascript
import * as dms from './src/core/deadManSwitch.js';

// Create switch with 7-day timelock
const result = await dms.createSwitch(
  "Emergency access codes: ...",
  168,  // 7 days = 168 hours
  true  // enable Bitcoin
);

console.log('Bitcoin Address:', result.bitcoin.address);
console.log('Timelock Height:', result.bitcoin.timelockHeight);
console.log('Blocks Until Valid:', result.bitcoin.blocksUntilValid);
```

### Example 2: Monitor Timelock Status

```javascript
// Get live blockchain status
const status = await dms.getStatus(switchId, true);

if (status.bitcoin?.enabled) {
  console.log('Current Height:', status.bitcoin.currentHeight);
  console.log('Timelock Height:', status.bitcoin.timelockHeight);
  console.log('Blocks Remaining:', status.bitcoin.blocksRemaining);
  console.log('Is Valid:', status.bitcoin.isValid);

  if (status.bitcoin.isValid) {
    console.log('⚠️ Timelock expired! Secret can be released.');
  } else {
    const eta = status.bitcoin.blocksRemaining * 10; // minutes
    console.log(`⏰ Timelock valid in ~${eta} minutes`);
  }
}
```

### Example 3: Check Multiple Switches

```javascript
const switches = dms.listSwitches();

for (const sw of switches) {
  const status = await dms.getStatus(sw.id, true);

  if (status.bitcoin?.enabled) {
    console.log(`Switch ${sw.id.substring(0, 8)}...`);
    console.log(`  Blocks remaining: ${status.bitcoin.blocksRemaining}`);
    console.log(`  Status: ${status.bitcoin.isValid ? 'VALID' : 'LOCKED'}`);
  }
}
```

## Production Deployment

### Prerequisites

**1. Bitcoin Testnet Preparation**
- Get testnet coins from faucets
- Set up wallet for timelock addresses
- Test transaction broadcasting

**2. Nostr Relay Setup**
- Configure 7+ reliable relays
- Test fragment distribution
- Monitor relay health

**3. Infrastructure**
- Reliable Bitcoin node or API access
- Monitoring for block height
- Alerting for timelock expiry

### Deployment Steps

**Step 1: Fund Timelock Address**
```bash
# Get testnet coins from faucet
curl -X POST https://testnet-faucet.mempool.co/api/faucet \
  -d "address=YOUR_TIMELOCK_ADDRESS"

# Wait for confirmation (~10 minutes)
```

**Step 2: Distribute Fragments**
```javascript
// In production, fragments go to Nostr relays
// This is done automatically by deadManSwitch.js
// with nostr relay configuration
```

**Step 3: Monitor Both Systems**
```javascript
// Application timer
setInterval(async () => {
  const status = await dms.getStatus(switchId, true);

  // Check application timer
  if (status.timeRemaining <= 0) {
    console.log('⚠️ Application timer expired');
  }

  // Check Bitcoin timelock
  if (status.bitcoin?.isValid) {
    console.log('⚠️ Bitcoin timelock valid');
  }

  // Trigger release only if both are expired
  if (status.isExpired && status.bitcoin?.isValid) {
    await triggerRelease(switchId);
  }
}, 60000); // Check every minute
```

**Step 4: Handle Release**
```javascript
async function triggerRelease(switchId) {
  // 1. Verify timelock is valid
  const status = await dms.getStatus(switchId, true);
  if (!status.bitcoin?.isValid) {
    throw new Error('Bitcoin timelock not yet valid');
  }

  // 2. Fetch fragments from Nostr relays
  const fragments = await fetchFragmentsFromNostr(switchId);

  // 3. Reconstruct key and decrypt
  const result = await dms.testRelease(switchId);

  // 4. Publish/notify secret
  console.log('Released:', result.reconstructedMessage);
}
```

## Security Considerations

### Strengths

**1. Consensus Enforcement**
- Bitcoin network validates timelock
- Cannot be censored or manipulated
- Transparent and verifiable

**2. Decentralization**
- No single point of failure
- Multiple independent verification
- Resistant to coordinated attacks

**3. Immutability**
- Once published, cannot be changed
- Time constraints are permanent
- Predictable execution

### Limitations

**1. Median Time Past (MTP)**
- ~2 hour uncertainty window
- Actual release may lag target time
- Users must account for this

**2. Fee Market Volatility**
- High fees may delay transactions
- Must provision adequate fees
- Consider fee market conditions

**3. Block Production Variance**
- Blocks not exactly 10 minutes
- Can be 1 minute or 60 minutes
- Average is 10 minutes over time

**4. No Instant Finality**
- Requires block confirmations
- Subject to reorganizations
- Wait for 6+ confirmations

### Mitigations

**1. Safety Margins**
- Add buffer time to timelocks
- Account for MTP uncertainty
- Plan for fee market spikes

**2. Redundancy**
- Combine Bitcoin + app timer
- Use Nostr for fragment distribution
- Multiple independent systems

**3. Monitoring**
- Track block height continuously
- Alert on timelock approach
- Monitor fee market

**4. Testing**
- Extensive testnet testing
- Simulate various scenarios
- Verify all edge cases

## Testing

### Run Bitcoin Demo

```bash
npm run bitcoin-demo
```

**What it demonstrates:**
1. Connection to Bitcoin testnet
2. Timelock creation with OP_CLTV
3. P2SH address generation
4. Live blockchain monitoring
5. Status checking

### Manual Testing

**1. Create a timelocked switch:**
```bash
npm run cli
echolock> create
# Enable Bitcoin timelock when prompted
```

**2. Check status:**
```bash
echolock> status
# Shows both timer and Bitcoin block height
```

**3. Monitor blockchain:**
```bash
# Use Blockstream explorer
https://blockstream.info/testnet/

# Or check via API
curl https://blockstream.info/testnet/api/blocks/tip/height
```

## Troubleshooting

### Issue: "Connection failed to Blockstream API"

**Cause:** Network connectivity or API rate limiting

**Solution:**
- Check internet connection
- Wait and retry (rate limit resets)
- Use alternative Bitcoin API if needed

### Issue: "Bitcoin timelock creation failed"

**Cause:** API unavailable or invalid parameters

**Solution:**
- Verify testnet connectivity
- Check block height calculation
- Ensure valid key generation

### Issue: "Timelock shows as invalid when it should be valid"

**Cause:** Median Time Past (MTP) lag

**Solution:**
- Wait an additional 1-2 hours
- MTP uses median of last 11 blocks
- This is expected behavior

### Issue: "Can't broadcast transaction"

**Cause:** Transaction not properly funded or signed

**Solution:**
- In demo: transactions aren't broadcast (structure only)
- For production: use testnet faucet to fund
- Ensure proper signing with private key

## Resources

### Bitcoin Documentation
- [Bitcoin Developer Guide](https://developer.bitcoin.org/devguide/)
- [BIP 65 - OP_CHECKLOCKTIMEVERIFY](https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki)
- [Bitcoin Script Reference](https://en.bitcoin.it/wiki/Script)

### Testnet Resources
- [Blockstream Testnet Explorer](https://blockstream.info/testnet/)
- [Bitcoin Testnet Faucets](https://testnet.help/en/btcfaucet/testnet)
- [Testnet3 Information](https://en.bitcoin.it/wiki/Testnet)

### Libraries
- [bitcoinjs-lib](https://github.com/bitcoinjs/bitcoinjs-lib) - Bitcoin operations
- [Blockstream API Docs](https://github.com/Blockstream/esplora/blob/master/API.md)

## Future Enhancements

### Planned Features
- [ ] Automated transaction broadcasting
- [ ] Multi-signature timelock schemes
- [ ] Lightning Network integration
- [ ] Hardware wallet support
- [ ] Submarine swaps for privacy

### Under Consideration
- [ ] Taproot support (BIP 341)
- [ ] Discreet Log Contracts (DLCs)
- [ ] Federated sidechains
- [ ] Liquid Network integration

## License

[To be determined]

---

**Built on Bitcoin Testnet**
**Status**: Integration Complete ✅
**Version**: 0.1.0