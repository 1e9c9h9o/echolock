'use strict';

// Bitcoin Testnet Integration Demo
// Demonstrates Bitcoin timelock integration with dead man's switch

import * as dms from '../core/deadManSwitch.js';
import {
  getCurrentBlockHeight,
  getTimelockStatus,
  getFeeEstimates,
  getTestnetFaucets
} from '../bitcoin/testnetClient.js';
import {
  logo, red, green, yellow, blue, cyan, dim, bright,
  statusBadge, formatTime
} from './colors.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function bitcoinDemo() {
  console.clear();
  console.log(logo());
  console.log(bright(yellow('═'.repeat(74))));
  console.log(bright('              🟠  BITCOIN TESTNET INTEGRATION DEMO  🟠'));
  console.log(bright(yellow('═'.repeat(74))));
  console.log();

  // Step 1: Check Bitcoin testnet connection
  console.log(yellow('📍 STEP 1: Connecting to Bitcoin Testnet\n'));
  console.log(dim('   Connecting to Blockstream Testnet API...'));

  await sleep(800);

  try {
    const currentHeight = await getCurrentBlockHeight();
    console.log(green('   ✓ Connected to Bitcoin testnet'));
    console.log(bright('   • Current block height: ') + cyan(currentHeight.toLocaleString()));

    const fees = await getFeeEstimates();
    console.log(bright('   • Fee estimates: ') + dim(`${fees.fastest} sat/vB (fast), ${fees.economy} sat/vB (economy)`));
    console.log();
  } catch (error) {
    console.log(red(`   ✗ Connection failed: ${error.message}`));
    console.log(dim('\n   Note: This demo requires internet connection to Blockstream API\n'));
    return;
  }

  await sleep(1500);

  // Step 2: Create switch with Bitcoin timelock
  console.log(yellow('📍 STEP 2: Creating Dead Man\'s Switch with Bitcoin Timelock\n'));
  console.log(dim('   Creating switch with Bitcoin timelock integration...'));
  console.log(dim('   Setting timelock for +10 blocks (~100 minutes)...\n'));

  await sleep(1000);

  const secretMessage = "Bitcoin timelock release successful!\n\n" +
    "This message was protected by a Bitcoin timelock using OP_CHECKLOCKTIMEVERIFY.\n" +
    "The timelock prevents early release by requiring a specific block height.\n\n" +
    "⛓️  ECHOLOCK + Bitcoin = Decentralized Dead Man's Switch";

  // Create switch with very short duration for demo (10 blocks ~= 100 minutes)
  const result = await dms.createSwitch(secretMessage, 100/60, true); // ~100 minutes

  await sleep(800);

  if (result.bitcoin?.enabled) {
    console.log(green('   ✓ Bitcoin timelock created!\n'));
    console.log(bright('   Switch ID:         ') + cyan(result.switchId));
    console.log(bright('   Bitcoin Status:    ') + green('ENABLED'));
    console.log(bright('   Current Height:    ') + cyan(result.bitcoin.currentHeight.toLocaleString()));
    console.log(bright('   Timelock Height:   ') + cyan(result.bitcoin.timelockHeight.toLocaleString()));
    console.log(bright('   Blocks Until Valid:') + yellow(` ${result.bitcoin.blocksUntilValid} blocks`));
    console.log(bright('   Estimated Time:    ') + dim(`~${result.bitcoin.blocksUntilValid * 10} minutes`));
    console.log(bright('   P2SH Address:      ') + dim(result.bitcoin.address));
    console.log();
  } else {
    console.log(red('   ✗ Bitcoin timelock creation failed'));
    console.log(dim(`   Error: ${result.bitcoin?.error || 'Unknown error'}\n`));
    return;
  }

  await sleep(2000);

  // Step 3: Show timelock script
  console.log(yellow('📍 STEP 3: Bitcoin Timelock Script\n'));
  console.log(dim('   Script Type: P2SH with OP_CHECKLOCKTIMEVERIFY\n'));
  console.log(bright('   Script (ASM):\n'));
  console.log(cyan('   ' + result.bitcoin.scriptAsm.replace(/ /g, '\n   ')));
  console.log();
  console.log(dim('   This script requires:'));
  console.log(dim('   1. Block height >= ' + result.bitcoin.timelockHeight));
  console.log(dim('   2. Valid signature matching the public key'));
  console.log();

  await sleep(2500);

  // Step 4: Monitor timelock status
  console.log(yellow('📍 STEP 4: Monitoring Timelock Status\n'));
  console.log(dim('   Fetching live blockchain data...\n'));

  await sleep(1000);

  const status = await dms.getStatus(result.switchId, true);

  if (status.bitcoin) {
    console.log(bright('   📊 Timelock Status:\n'));
    console.log(bright('   • Locktime Type:      ') + status.bitcoin.type);
    console.log(bright('   • Current Height:     ') + cyan(status.bitcoin.currentHeight?.toLocaleString() || 'N/A'));
    console.log(bright('   • Timelock Height:    ') + cyan(status.bitcoin.timelockHeight?.toLocaleString() || 'N/A'));
    console.log(bright('   • Blocks Remaining:   ') + yellow(status.bitcoin.blocksRemaining || 0));
    console.log(bright('   • Status:             ') + (status.bitcoin.isValid ? green('VALID ✓') : red('LOCKED 🔒')));

    if (status.bitcoin.latestBlock) {
      console.log(bright('   • Latest Block Hash:  ') + dim(status.bitcoin.latestBlock.hash.substring(0, 16) + '...'));
      console.log(bright('   • Block Timestamp:    ') + dim(new Date(status.bitcoin.latestBlock.timestamp * 1000).toLocaleString()));
    }
    console.log();
  }

  await sleep(2000);

  // Step 5: Explain Bitcoin integration
  console.log(yellow('📍 STEP 5: How Bitcoin Timelock Integration Works\n'));
  console.log(bright('   1. Switch Creation:'));
  console.log(dim('      → Generate encryption key (256 bits)'));
  console.log(dim('      → Encrypt message with AES-256-GCM'));
  console.log(dim('      → Split key into 5 Shamir fragments (3-of-5)'));
  console.log(green('      → Create Bitcoin timelock transaction'));
  console.log();

  console.log(bright('   2. Timelock Script:'));
  console.log(dim('      → OP_CHECKLOCKTIMEVERIFY ensures block height requirement'));
  console.log(dim('      → Script becomes spendable only after target block'));
  console.log(dim('      → P2SH address locks funds until timelock expires'));
  console.log();

  console.log(bright('   3. Release Mechanism:'));
  console.log(dim('      → Monitor current block height vs. timelock height'));
  console.log(dim('      → When blocks >= timelock height, release is valid'));
  console.log(dim('      → Fragments can be retrieved and key reconstructed'));
  console.log(dim('      → Message decrypted with reconstructed key'));
  console.log();

  await sleep(3000);

  // Step 6: Production deployment notes
  console.log(yellow('📍 STEP 6: Production Deployment\n'));
  console.log(bright('   For production use:\n'));
  console.log(dim('   1. Fund the timelock address from testnet faucet:'));
  const faucets = getTestnetFaucets();
  faucets.slice(0, 2).forEach(url => {
    console.log(cyan(`      • ${url}`));
  });
  console.log();

  console.log(dim('   2. Distribute Shamir fragments to Nostr relays:'));
  console.log(dim('      → Minimum 7 relays with geographic distribution'));
  console.log(dim('      → Each fragment stored on multiple relays'));
  console.log(dim('      → Redundancy prevents single point of failure'));
  console.log();

  console.log(dim('   3. Monitor both systems:'));
  console.log(dim('      → Bitcoin block height (on-chain verification)'));
  console.log(dim('      → Application timer (user interface)'));
  console.log(dim('      → Nostr relay health (fragment availability)'));
  console.log();

  await sleep(2000);

  // Summary
  console.log(bright(green('═'.repeat(74))));
  console.log(bright(green('                     ✓ DEMO COMPLETE')));
  console.log(bright(green('═'.repeat(74))));
  console.log();
  console.log(bright('   🎉 Bitcoin Timelock Integration Demonstrated!\n'));
  console.log(bright('   ✓ Connected to Bitcoin testnet'));
  console.log(bright('   ✓ Created OP_CHECKLOCKTIMEVERIFY script'));
  console.log(bright('   ✓ Generated P2SH timelock address'));
  console.log(bright('   ✓ Monitored blockchain status'));
  console.log(bright('   ✓ Integrated with dead man\'s switch'));
  console.log();

  await sleep(1500);

  // Important notes
  console.log(bright(yellow('═'.repeat(74))));
  console.log(bright(yellow('                     ⚠️  IMPORTANT NOTES')));
  console.log(bright(yellow('═'.repeat(74))));
  console.log();
  console.log(red('   This is a TESTNET demonstration only.'));
  console.log(red('   For production use:'));
  console.log(dim('   • Complete security audit required'));
  console.log(dim('   • Fund timelock addresses properly'));
  console.log(dim('   • Distribute fragments to Nostr relays'));
  console.log(dim('   • Test extensively on testnet first'));
  console.log(dim('   • Consider Bitcoin fee market volatility'));
  console.log(dim('   • Account for ~2 hour MTP uncertainty'));
  console.log();
  console.log(bright(yellow('═'.repeat(74))));
  console.log();

  await sleep(1500);

  console.log(bright('📚 More Information:\n'));
  console.log(cyan('   • Documentation: BITCOIN_INTEGRATION.md'));
  console.log(cyan('   • Try CLI: npm run cli'));
  console.log(cyan('   • Run tests: npm test\n'));

  // Cleanup
  console.log(dim('🧹 Cleaning up demo data...'));
  dms.deleteSwitch(result.switchId);
  console.log(green('   ✓ Bitcoin demo complete!\n'));
}

// Run demo
bitcoinDemo().catch(error => {
  console.error(red(`\n✗ Bitcoin demo error: ${error.message}\n`));
  console.error(error.stack);
  process.exit(1);
});