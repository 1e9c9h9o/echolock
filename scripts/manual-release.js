#!/usr/bin/env node
'use strict';

/**
 * Manual Release Script
 *
 * Manually process a TRIGGERED switch and send emails to recipients
 * Use this when a switch is stuck in TRIGGERED status
 */

import { query } from '../src/api/db/connection.js';
import { sendSwitchReleaseEmail } from '../src/api/services/emailService.js';
import { testRelease } from '../src/core/deadManSwitch.js';
import { logger } from '../src/api/utils/logger.js';

const SWITCH_ID = process.argv[2];

if (!SWITCH_ID) {
  console.error('Usage: node scripts/manual-release.js <switch-id>');
  process.exit(1);
}

async function manualRelease(switchId) {
  try {
    console.log(`\n🔍 Processing switch: ${switchId}\n`);

    // Step 1: Get switch details
    const switchResult = await query(
      'SELECT * FROM switches WHERE id = $1',
      [switchId]
    );

    if (switchResult.rows.length === 0) {
      throw new Error('Switch not found');
    }

    const sw = switchResult.rows[0];
    console.log(`Switch: ${sw.title}`);
    console.log(`Status: ${sw.status}`);
    console.log(`Expires At: ${sw.expires_at}`);
    console.log(`Triggered At: ${sw.triggered_at}`);
    console.log(`Released At: ${sw.released_at}\n`);

    // Step 2: Check if already released
    if (sw.status === 'RELEASED' && sw.released_at) {
      console.log('⚠️  Switch already marked as RELEASED');

      // Check release log
      const logResult = await query(
        'SELECT * FROM release_log WHERE switch_id = $1',
        [switchId]
      );

      console.log(`\nRelease log entries: ${logResult.rows.length}`);
      logResult.rows.forEach(log => {
        console.log(`  - ${log.email}: ${log.status} ${log.error_message || ''}`);
      });

      return;
    }

    // Step 3: Retrieve message from Nostr
    console.log('📡 Retrieving message from Nostr...');
    const releaseResult = await testRelease(switchId, null, false);

    if (!releaseResult.success) {
      throw new Error(`Release failed: ${releaseResult.message}`);
    }

    const message = releaseResult.reconstructedMessage;
    console.log(`✅ Message reconstructed (${message.length} characters)`);
    console.log(`   Shares used: ${releaseResult.sharesUsed}\n`);

    // Step 4: Get recipients
    const recipientsResult = await query(
      'SELECT id, email, name FROM recipients WHERE switch_id = $1',
      [switchId]
    );

    const recipients = recipientsResult.rows;
    console.log(`📧 Recipients: ${recipients.length}`);

    if (recipients.length === 0) {
      console.log('⚠️  No recipients found for this switch');
      return;
    }

    // Step 5: Check existing release log
    const existingLogs = await query(
      'SELECT * FROM release_log WHERE switch_id = $1',
      [switchId]
    );

    console.log(`Existing release log entries: ${existingLogs.rows.length}\n`);

    // Step 6: Send emails
    const emailResults = [];

    for (const recipient of recipients) {
      // Check if already sent
      const alreadySent = existingLogs.rows.find(
        log => log.recipient_id === recipient.id && log.status === 'SENT'
      );

      if (alreadySent) {
        console.log(`  ⏭️  ${recipient.email} - Already sent (skipping)`);
        emailResults.push({ email: recipient.email, status: 'ALREADY_SENT' });
        continue;
      }

      try {
        console.log(`  📤 Sending to ${recipient.email}...`);

        await sendSwitchReleaseEmail(
          recipient.email,
          message,
          sw.title,
          'Manual release - Timer expired'
        );

        // Log successful send
        await query(
          `INSERT INTO release_log (switch_id, recipient_id, email, status)
           VALUES ($1, $2, $3, $4)`,
          [switchId, recipient.id, recipient.email, 'SENT']
        );

        console.log(`  ✅ Sent to ${recipient.email}`);
        emailResults.push({ email: recipient.email, status: 'SENT' });
      } catch (emailError) {
        console.error(`  ❌ Failed to send to ${recipient.email}: ${emailError.message}`);

        // Log failed send
        await query(
          `INSERT INTO release_log (switch_id, recipient_id, email, status, error_message)
           VALUES ($1, $2, $3, $4, $5)`,
          [switchId, recipient.id, recipient.email, 'FAILED', emailError.message]
        );

        emailResults.push({ email: recipient.email, status: 'FAILED', error: emailError.message });
      }
    }

    // Step 7: Update switch status to RELEASED
    await query(
      'UPDATE switches SET status = $1, released_at = NOW() WHERE id = $2',
      ['RELEASED', switchId]
    );

    // Audit log
    await query(
      `INSERT INTO audit_log (user_id, event_type, event_data)
       VALUES ($1, $2, $3)`,
      [
        sw.user_id,
        'SWITCH_RELEASED_MANUAL',
        JSON.stringify({
          switchId,
          title: sw.title,
          recipientCount: recipients.length,
          emailResults
        })
      ]
    );

    console.log('\n✅ Manual release complete!');
    console.log('\nResults:');
    emailResults.forEach(result => {
      console.log(`  ${result.status === 'SENT' ? '✅' : result.status === 'ALREADY_SENT' ? '⏭️' : '❌'} ${result.email}: ${result.status}`);
    });

  } catch (error) {
    console.error('\n❌ Manual release failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

manualRelease(SWITCH_ID);
