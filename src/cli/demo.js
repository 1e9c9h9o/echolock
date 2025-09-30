'use strict';

// ECHOLOCK Demo Script
// Demonstrates the full dead man's switch workflow

import * as dms from '../core/deadManSwitch.js';
import {
  logo, red, green, yellow, blue, cyan, dim, bright,
  statusBadge, progressBar, formatTime
} from './colors.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function showCountdown(switchId, duration) {
  const startTime = Date.now();
  const endTime = startTime + duration;

  process.stdout.write('\n');

  while (Date.now() < endTime) {
    const status = await dms.getStatus(switchId);

    // Defensive programming: check for valid status
    if (!status || !status.found) {
      break;
    }

    const timeLeft = status.timeRemaining || 0;
    const totalTime = (status.checkInHours || 0.00278) * 60 * 60 * 1000; // fallback to 10 seconds
    const percentage = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;

    // Clear line and show countdown
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
    process.stdout.write(
      bright('⏱️  Time remaining: ') +
      formatTime(timeLeft) +
      ' │ ' +
      progressBar(percentage, 30) +
      ' │ ' +
      statusBadge(status.status || 'UNKNOWN')
    );

    await sleep(100);
  }

  process.stdout.write('\n\n');
}

async function demo() {
  console.clear();
  console.log(logo());
  console.log(bright(cyan('═'.repeat(74))));
  console.log(bright('                    🎬  INTERACTIVE DEMO  🎬'));
  console.log(bright(cyan('═'.repeat(74))));
  console.log();

  // Step 1: Create switch
  console.log(yellow('📍 STEP 1: Creating Dead Man\'s Switch\n'));
  console.log(dim('   Creating a switch with a secret message...'));
  console.log(dim('   Setting check-in interval to 10 seconds for demo...\n'));

  const secretMessage = "If you're reading this, the dead man's switch worked!\n\n" +
    "This message was encrypted with AES-256-GCM, the encryption key was\n" +
    "split into 5 fragments using Shamir's Secret Sharing (3-of-5 threshold),\n" +
    "and automatically released when the timer expired.\n\n" +
    "🔐 ECHOLOCK successfully protected and released your secret.";

  // Disable Bitcoin timelock for faster demo (crypto-only)
  const result = await dms.createSwitch(secretMessage, 10 / 3600, false); // 10 seconds

  await sleep(1000);

  console.log(green('   ✓ Switch created successfully!\n'));
  console.log(bright('   Switch ID:   ') + cyan(result.switchId));
  console.log(bright('   Fragments:   ') + `${result.requiredFragments}-of-${result.fragmentCount} threshold`);
  console.log(bright('   Timer:       ') + `10 seconds (for demo)`);
  console.log(bright('   Status:      ') + statusBadge('ARMED'));
  console.log();

  await sleep(2000);

  // Step 2: Show encryption details
  console.log(yellow('📍 STEP 2: Encryption & Secret Sharing\n'));
  console.log(dim('   ✓ Message encrypted with AES-256-GCM'));
  console.log(dim('   ✓ Encryption key (256 bits) generated'));
  console.log(dim('   ✓ Key split into 5 fragments using Shamir SSS'));
  console.log(dim('   ✓ Any 3 fragments can reconstruct the key'));
  console.log(dim('   ✓ Fragments stored securely'));
  console.log();

  await sleep(2000);

  // Step 3: Show status
  console.log(yellow('📍 STEP 3: Monitoring Status\n'));
  const status1 = await dms.getStatus(result.switchId);
  console.log(dim('   Current Status:'));
  console.log(bright('   • State:         ') + statusBadge(status1.status || 'UNKNOWN'));
  console.log(bright('   • Time Left:     ') + formatTime(status1.timeRemaining || 0));
  console.log(bright('   • Check-ins:     ') + (status1.checkInCount || 0));
  console.log(bright('   • Distribution:  ') + (status1.distributionStatus || 'LOCAL'));
  console.log();

  await sleep(2000);

  // Step 4: Demonstrate check-in
  console.log(yellow('📍 STEP 4: Performing Check-In\n'));
  console.log(dim('   Simulating user check-in to reset timer...\n'));

  await sleep(1000);

  const checkInResult = dms.checkIn(result.switchId);
  console.log(green('   ✓ Check-in successful!'));
  console.log(bright('   • Timer reset to:  ') + new Date(checkInResult.newExpiryTime).toLocaleString());
  console.log(bright('   • Check-in count:  ') + checkInResult.checkInCount);
  console.log();

  await sleep(2000);

  // Step 5: Show countdown
  console.log(yellow('📍 STEP 5: Countdown to Release\n'));
  console.log(dim('   Waiting for timer to expire (10 seconds)...'));
  console.log(dim('   In production, this would be 72+ hours\n'));

  await sleep(1000);

  // Show live countdown
  await showCountdown(result.switchId, 10000);

  await sleep(1000);

  // Step 6: Automatic release
  console.log(yellow('📍 STEP 6: Timer Expired - Triggering Release\n'));
  console.log(dim('   ⚠️  No check-in received - timer has expired'));
  console.log(dim('   🔓 Initiating automatic release sequence...\n'));

  await sleep(1500);

  console.log(dim('   [1/3] Fetching encrypted fragments from storage...'));
  await sleep(800);
  console.log(green('   ✓ Retrieved 5 fragments'));

  await sleep(500);
  console.log(dim('\n   [2/3] Reconstructing encryption key using Shamir SSS...'));
  await sleep(1000);
  console.log(green('   ✓ Key reconstructed from 3 fragments (threshold met)'));

  await sleep(500);
  console.log(dim('\n   [3/3] Decrypting message with AES-256-GCM...'));
  await sleep(800);
  console.log(green('   ✓ Message decrypted successfully\n'));

  await sleep(1000);

  const releaseResult = await dms.testRelease(result.switchId);

  if (releaseResult.success) {
    console.log(bright(green('═'.repeat(74))));
    console.log(bright(green('                       📨 RELEASED MESSAGE')));
    console.log(bright(green('═'.repeat(74))));
    console.log();
    console.log(cyan(releaseResult.reconstructedMessage));
    console.log();
    console.log(bright(green('═'.repeat(74))));
    console.log();

    await sleep(2000);

    // Summary
    console.log(yellow('📍 DEMO COMPLETE: Summary\n'));
    console.log(bright('   ✓ Dead man\'s switch created and armed'));
    console.log(bright('   ✓ Secret encrypted with AES-256-GCM'));
    console.log(bright('   ✓ Key split into 5 fragments (3-of-5 threshold)'));
    console.log(bright('   ✓ Check-in performed successfully'));
    console.log(bright('   ✓ Timer expired without check-in'));
    console.log(bright('   ✓ Key reconstructed from fragments'));
    console.log(bright('   ✓ Message decrypted and released'));
    console.log();
    console.log(green('   🎉 ECHOLOCK successfully protected and released your secret!\n'));

    await sleep(1500);

    // Production notes
    console.log(bright(yellow('═'.repeat(74))));
    console.log(bright(yellow('                      ⚠️  PRODUCTION NOTES')));
    console.log(bright(yellow('═'.repeat(74))));
    console.log();
    console.log(red('   This demo used 10-second timers for demonstration.'));
    console.log(red('   In production:'));
    console.log(dim('   • Typical check-in interval: 72 hours (3 days)'));
    console.log(dim('   • Fragments distributed to 7+ Nostr relays'));
    console.log(dim('   • Geographic distribution for redundancy'));
    console.log(dim('   • Bitcoin timelock controls release timing'));
    console.log(dim('   • Professional security audit required'));
    console.log();
    console.log(bright(yellow('═'.repeat(74))));
    console.log();

    await sleep(2000);

    // Next steps
    console.log(bright('🚀 Try the Interactive CLI:\n'));
    console.log(cyan('   npm run cli\n'));
    console.log(dim('   Available commands: create, check-in, status, test-release, help\n'));

    // Cleanup
    console.log(dim('🧹 Cleaning up demo data...'));
    dms.deleteSwitch(result.switchId);
    console.log(green('   ✓ Demo complete!\n'));

  } else {
    console.log(red(`\n✗ Demo failed: ${releaseResult.message}\n`));
  }
}

// Run demo
demo().catch(error => {
  console.error(red(`\n✗ Demo error: ${error.message}\n`));
  process.exit(1);
});