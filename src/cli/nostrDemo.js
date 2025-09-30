#!/usr/bin/env node
'use strict';

/**
 * Nostr Distribution Demo
 * Demonstrates the Nostr fragment distribution system
 */

import { createSwitch, testRelease } from '../core/deadManSwitch.js';

async function main() {
  console.log('='.repeat(60));
  console.log('ECHOLOCK - Nostr Distribution Demo');
  console.log('='.repeat(60));
  console.log();

  // Set environment variable to enable Nostr distribution
  process.env.USE_NOSTR_DISTRIBUTION = 'true';

  console.log('Creating a dead man\'s switch with Nostr distribution...');
  console.log();

  try {
    const message = 'Secret message for Nostr distribution test - ' + new Date().toISOString();
    const checkInHours = 0.01; // 36 seconds for demo

    console.log('Message:', message);
    console.log('Check-in interval:', checkInHours, 'hours (~36 seconds for demo)');
    console.log();

    const result = await createSwitch(message, checkInHours, false);

    console.log('Switch created successfully!');
    console.log('Switch ID:', result.switchId);
    console.log('Fragment count:', result.fragmentCount);
    console.log('Required fragments:', result.requiredFragments);
    console.log();

    if (result.distribution) {
      console.log('Distribution Info:');
      console.log('  Status:', result.distribution.distributionStatus);
      console.log('  Relay count:', result.distribution.relayCount);

      if (result.distribution.distributionStatus === 'NOSTR') {
        console.log('  Nostr public key:', result.distribution.nostrPublicKey?.substring(0, 16) + '...');
        console.log();
        console.log('Fragments successfully published to Nostr relays!');
      } else {
        console.log();
        console.log('Using local storage (Nostr distribution not enabled or failed)');
      }
    }
    console.log();

    // Test retrieval
    console.log('Testing fragment retrieval and message reconstruction...');
    console.log();

    const releaseResult = await testRelease(result.switchId);

    if (releaseResult.success) {
      console.log('✓ Message reconstruction successful!');
      console.log('  Distribution method:', releaseResult.distributionMethod);
      console.log('  Shares used:', releaseResult.sharesUsed, '/', releaseResult.totalShares);
      console.log('  Reconstructed message:', releaseResult.reconstructedMessage);
    } else {
      console.log('✗ Message reconstruction failed:', releaseResult.message);
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('Insufficient relays') || error.message.includes('healthy relays')) {
      console.log();
      console.log('Note: Nostr distribution requires at least 7 healthy relays.');
      console.log('The system has automatically fallen back to local storage.');
      console.log('To test with real Nostr relays, ensure you have network connectivity.');
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('Demo completed');
  console.log('='.repeat(60));
}

main().catch(console.error);