#!/usr/bin/env node
'use strict';

/**
 * Test Release Command - Safely release Bitcoin timelock funds
 *
 * Usage:
 *   node src/cli/testRelease.js <switchId> [--broadcast]
 *
 * Default: Dry run (validates but doesn't broadcast)
 * With --broadcast: Real broadcast (requires confirmation)
 */

import * as dms from '../core/deadManSwitch.js';
import * as timelockSpender from '../bitcoin/timelockSpender.js';
import * as broadcastManager from '../bitcoin/broadcastManager.js';
import { getCurrentBlockHeight } from '../bitcoin/testnetClient.js';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const { red, green, yellow, cyan, dim, bright } = await import('./colors.js');

/**
 * Prompt for password (hidden input not supported in basic Node.js)
 */
async function promptPassword() {
  const rl = readline.createInterface({ input, output });
  try {
    const password = await rl.question('Enter switch password: ');
    return password;
  } finally {
    rl.close();
  }
}

/**
 * Display switch status
 */
function displaySwitchStatus(status) {
  console.log('\n' + bright(cyan('═'.repeat(70))));
  console.log(bright('                    SWITCH STATUS'));
  console.log(bright(cyan('═'.repeat(70))) + '\n');

  console.log(`  Switch ID:          ${status.switchId}`);
  console.log(`  Created:            ${new Date(status.createdAt).toLocaleString()}`);
  console.log(`  Expires:            ${new Date(status.expiresAt).toLocaleString()}`);
  console.log(`  Status:             ${status.hasExpired ? green('EXPIRED ✓') : yellow('ACTIVE')}`);
  console.log(`  Bitcoin Enabled:    ${status.bitcoin ? green('YES') : red('NO')}`);

  if (status.bitcoin) {
    console.log(`\n  Bitcoin Details:`);
    console.log(`    Current Height:   ${status.bitcoin.currentHeight?.toLocaleString() || 'N/A'}`);
    console.log(`    Timelock Height:  ${status.bitcoin.timelockHeight?.toLocaleString() || 'N/A'}`);
    console.log(`    Blocks Past Lock: ${status.bitcoin.currentHeight - status.bitcoin.timelockHeight || 0}`);
    console.log(`    Timelock Valid:   ${status.bitcoin.isValid ? green('YES ✓') : red('NO')}`);
    console.log(`    Address:          ${dim(status.bitcoin.address || 'N/A')}`);
  }

  console.log('\n' + bright(cyan('═'.repeat(70))) + '\n');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
${bright('ECHOLOCK Test Release')}

Safely release Bitcoin timelock funds with production-grade safeguards.

${bright('Usage:')}
  node src/cli/testRelease.js <switchId> [options]

${bright('Options:')}
  --broadcast    Broadcast transaction to network (default: dry run)
  --help         Show this help message

${bright('Examples:')}
  # Dry run (validates but doesn't broadcast)
  node src/cli/testRelease.js switch-abc123

  # Real broadcast (requires confirmation)
  node src/cli/testRelease.js switch-abc123 --broadcast

${bright('Safety Features:')}
  ✓ Validates destination address format
  ✓ Enforces max testnet amount (0.01 tBTC)
  ✓ Requires timelock expired for 10+ blocks
  ✓ Displays transaction details before broadcast
  ✓ Requires user confirmation: "yes" (not just Enter)
  ✓ Requires password re-entry
  ✓ Maintains audit trail in data/tx-history.json

${yellow('⚠️  WARNING: TESTNET ONLY')}
Broadcasting consumes real testnet Bitcoin. Ensure timelock logic is
correct before enabling mainnet. Never enable mainnet without
professional security audit.
    `);
    process.exit(0);
  }

  const switchId = args[0];
  const shouldBroadcast = args.includes('--broadcast');

  console.clear();
  console.log(bright(yellow('═'.repeat(70))));
  console.log(bright(yellow('              🔓  ECHOLOCK TEST RELEASE  🔓')));
  console.log(bright(yellow('═'.repeat(70))) + '\n');

  try {
    // Step 1: Get switch status
    console.log(yellow('📍 STEP 1: Checking Switch Status\n'));
    console.log(dim('   Loading switch data...'));

    const status = await dms.getStatus(switchId, true);

    if (!status.exists) {
      console.log(red(`\n   ✗ Switch not found: ${switchId}\n`));
      process.exit(1);
    }

    displaySwitchStatus(status);

    // Step 2: Validate Bitcoin setup
    console.log(yellow('📍 STEP 2: Validating Bitcoin Configuration\n'));

    if (!status.bitcoin) {
      console.log(red('   ✗ Bitcoin not enabled for this switch\n'));
      console.log(dim('   Create a new switch with: npm run cli -- create --bitcoin\n'));
      process.exit(1);
    }

    if (!status.hasExpired) {
      console.log(red('   ✗ Switch has not expired yet\n'));
      console.log(dim(`   Expires: ${new Date(status.expiresAt).toLocaleString()}\n`));
      process.exit(1);
    }

    if (!status.bitcoin.isValid) {
      console.log(red('   ✗ Bitcoin timelock not yet valid\n'));
      console.log(dim(`   Current: block ${status.bitcoin.currentHeight?.toLocaleString()}`));
      console.log(dim(`   Required: block ${status.bitcoin.timelockHeight?.toLocaleString()}\n`));
      process.exit(1);
    }

    const currentHeight = await getCurrentBlockHeight();
    const blocksPastLock = currentHeight - status.bitcoin.timelockHeight;

    if (blocksPastLock < broadcastManager.SAFETY_LIMITS.MIN_BLOCKS_PAST_TIMELOCK) {
      console.log(red(`   ✗ Timelock expired only ${blocksPastLock} blocks ago\n`));
      console.log(dim(`   Minimum required: ${broadcastManager.SAFETY_LIMITS.MIN_BLOCKS_PAST_TIMELOCK} blocks\n`));
      console.log(dim('   This safety margin prevents issues from blockchain reorganizations.\n'));
      process.exit(1);
    }

    console.log(green('   ✓ Bitcoin configuration valid'));
    console.log(green(`   ✓ Timelock expired ${blocksPastLock} blocks ago\n`));

    // Step 3: Get password and decrypt keys
    console.log(yellow('📍 STEP 3: Authentication\n'));

    const password = await promptPassword();

    console.log(dim('\n   Decrypting private key...'));

    const switchData = await dms.loadSwitch(switchId);
    const privateKey = await timelockSpender.decryptPrivateKey(switchData.bitcoin, password);

    console.log(green('   ✓ Authentication successful\n'));

    // Step 4: Create spending transaction
    console.log(yellow('📍 STEP 4: Creating Spending Transaction\n'));

    console.log(dim('   Building transaction...'));

    // Default destination: return to a test address
    // In production, this would be user-specified
    const destinationAddress = 'tb1qeg829dt9kzuaq3vwmtdz07754zpplykn77xyg0'; // Example testnet address

    const spendResult = await timelockSpender.createTimelockSpendingTx({
      timelockAddress: status.bitcoin.address,
      timelockScript: switchData.bitcoin.timelockScript,
      locktime: status.bitcoin.timelockHeight,
      privateKey: privateKey,
      publicKey: Buffer.from(switchData.bitcoin.publicKey, 'hex'),
      destinationAddress: destinationAddress,
      feeRate: null, // Auto-select
      dryRun: false  // Create signed transaction
    });

    if (!spendResult.success) {
      console.log(red('   ✗ Transaction creation failed\n'));
      console.log(dim(`   Error: ${spendResult.error || 'Unknown error'}\n`));
      process.exit(1);
    }

    console.log(green('   ✓ Transaction created successfully\n'));
    console.log(dim('   Transaction Details:'));
    console.log(dim(`     Inputs:       ${spendResult.details.inputs}`));
    console.log(dim(`     Total Input:  ${spendResult.details.totalInput} sats`));
    console.log(dim(`     Output:       ${spendResult.details.outputAmount} sats`));
    console.log(dim(`     Fee:          ${spendResult.details.fee} sats (${spendResult.details.feeRate} sat/vB)`));
    console.log(dim(`     Size:         ~${spendResult.details.estimatedSize} vbytes\n`));

    // Step 5: Safety checks and broadcast
    console.log(yellow('📍 STEP 5: Broadcasting Transaction\n'));

    const broadcastResult = await broadcastManager.safeBroadcast({
      txHex: spendResult.signedTxHex,
      switchId: switchId,
      txDetails: {
        destinationAddress: destinationAddress,
        amount: spendResult.details.totalInput,
        fee: spendResult.details.fee,
        feeRate: spendResult.details.feeRate,
        inputs: spendResult.details.inputs,
        outputs: spendResult.details.outputs,
        locktime: status.bitcoin.timelockHeight
      },
      password: password,
      dryRun: !shouldBroadcast
    });

    if (broadcastResult.success && !broadcastResult.dryRun) {
      console.log(bright(green('\n═'.repeat(70))));
      console.log(bright(green('                   ✓ BROADCAST SUCCESSFUL')));
      console.log(bright(green('═'.repeat(70))) + '\n');

      console.log(bright('   Transaction ID: ') + cyan(broadcastResult.txid));
      console.log(bright('   Explorer URL:   ') + cyan(broadcastResult.confirmationUrl));
      console.log();

      console.log(dim('   Transaction broadcast at: ' + broadcastResult.broadcastedAt));
      console.log(dim('   View audit log: data/tx-history.json\n'));

      // Step 6: Monitor confirmation (optional)
      console.log(yellow('📍 STEP 6: Monitoring Confirmation (optional)\n'));
      console.log(dim('   Waiting for confirmation (press Ctrl+C to skip)...\n'));

      try {
        const monitorResult = await broadcastManager.monitorTransaction(
          broadcastResult.txid,
          switchId
        );

        if (monitorResult.success && monitorResult.confirmed) {
          console.log(bright(green('\n   ✓ Transaction confirmed!\n')));
        }
      } catch (error) {
        console.log(yellow('\n   Monitoring interrupted (transaction still processing)\n'));
      }

    } else if (broadcastResult.dryRun) {
      console.log(bright(green('\n═'.repeat(70))));
      console.log(bright(green('                   ✓ DRY RUN COMPLETE')));
      console.log(bright(green('═'.repeat(70))) + '\n');

      console.log(green('   All safety checks passed!'));
      console.log(dim('   Transaction ready to broadcast.\n'));

      console.log(yellow('   To broadcast for real, run:\n'));
      console.log(cyan(`   node src/cli/testRelease.js ${switchId} --broadcast\n`));
    } else {
      console.log(red('\n   ✗ Broadcast failed\n'));
      console.log(dim(`   Error: ${broadcastResult.error || 'Unknown error'}\n`));
      process.exit(1);
    }

  } catch (error) {
    console.log(red(`\n   ✗ Error: ${error.message}\n`));
    console.error(error.stack);
    process.exit(1);
  }

  console.log(bright(yellow('═'.repeat(70))));
  console.log(bright(yellow('                     🔓  COMPLETE  🔓')));
  console.log(bright(yellow('═'.repeat(70))) + '\n');
}

// Run
main().catch(error => {
  console.error(red(`\nFatal error: ${error.message}\n`));
  process.exit(1);
});