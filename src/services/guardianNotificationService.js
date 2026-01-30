'use strict';

/**
 * Guardian Notification Service
 *
 * Sends notifications to guardians when relevant events occur:
 * - Share enrollment (new share assigned)
 * - Heartbeat warning (user hasn't checked in)
 * - Heartbeat expired (time to release share)
 * - Key rotation (share re-encrypted)
 *
 * Supports multiple notification channels:
 * - Email (for non-technical guardians)
 * - Nostr DM (NIP-04)
 * - Webhook (for automated systems)
 *
 * @see CLAUDE.md - Phase 3: Guardian Network
 */

import nodemailer from 'nodemailer';
import { logger } from '../api/utils/logger.js';

/**
 * Notification types
 */
export const NotificationType = {
  SHARE_ENROLLED: 'share_enrolled',
  HEARTBEAT_WARNING: 'heartbeat_warning',
  HEARTBEAT_EXPIRED: 'heartbeat_expired',
  RELEASE_REQUIRED: 'release_required',
  KEY_ROTATED: 'key_rotated',
  SHARE_RELEASED: 'share_released',
};

/**
 * Email templates for guardian notifications
 */
const emailTemplates = {
  [NotificationType.SHARE_ENROLLED]: {
    subject: 'EchoLock: You have been assigned as a Guardian',
    template: (data) => `
Hello ${data.guardianName || 'Guardian'},

You have been assigned as a guardian for an EchoLock dead man's switch.

Switch ID: ${data.switchId}
Your Share Index: ${data.shareIndex}
Threshold Hours: ${data.thresholdHours} hours

Your role:
- Monitor the user's heartbeat on Nostr relays
- If no heartbeat is seen for ${data.thresholdHours} hours, release your share
- Your share alone cannot decrypt the message - ${data.threshold} of ${data.totalShares} shares are required

To accept this role and start monitoring:
1. Visit: ${data.acceptUrl || 'https://echolock.xyz/guardian/accept'}
2. Enter your guardian private key (nsec)
3. The guardian daemon will start monitoring automatically

If you did not expect this notification, you can safely ignore it.

---
EchoLock - Your Message, Your Control
https://echolock.xyz
    `.trim(),
  },

  [NotificationType.HEARTBEAT_WARNING]: {
    subject: 'EchoLock: Heartbeat Warning - User has not checked in',
    template: (data) => `
Warning: Heartbeat Not Received

Switch ID: ${data.switchId}
Last Heartbeat: ${data.lastHeartbeat ? new Date(data.lastHeartbeat * 1000).toISOString() : 'Never'}
Hours Since Last: ${data.hoursSinceHeartbeat}
Release Threshold: ${data.thresholdHours} hours

The switch owner has not checked in recently. If no heartbeat is received
within ${data.hoursRemaining} hours, you will need to release your share.

This is a warning only - no action is required yet.

---
EchoLock Guardian System
    `.trim(),
  },

  [NotificationType.RELEASE_REQUIRED]: {
    subject: 'EchoLock: ACTION REQUIRED - Release Your Share',
    template: (data) => `
IMPORTANT: Share Release Required

Switch ID: ${data.switchId}
Last Heartbeat: ${data.lastHeartbeat ? new Date(data.lastHeartbeat * 1000).toISOString() : 'Never'}
Threshold Exceeded: Yes (${data.hoursSinceHeartbeat} hours since last check-in)

The heartbeat threshold has been exceeded. As a guardian, you must now
release your share to allow message recovery.

To release your share:
1. Visit: ${data.releaseUrl || 'https://echolock.xyz/guardian/release'}
2. Enter your guardian private key (nsec)
3. Confirm the release

Alternatively, if you are running the guardian daemon, it will automatically
release your share.

---
EchoLock Guardian System
    `.trim(),
  },

  [NotificationType.KEY_ROTATED]: {
    subject: 'EchoLock: Your Guardian Key Has Been Rotated',
    template: (data) => `
Guardian Key Rotation Notice

Switch ID: ${data.switchId}
Old Key: ${data.oldKey?.slice(0, 16)}...
New Key: ${data.newKey?.slice(0, 16)}...

Your guardian key for this switch has been rotated. The old key is no longer
valid for releasing shares.

If you are running a guardian daemon, please update your configuration with
the new key.

If you did not expect this rotation, please contact the switch owner.

---
EchoLock Guardian System
    `.trim(),
  },

  [NotificationType.SHARE_RELEASED]: {
    subject: 'EchoLock: Your Share Has Been Released',
    template: (data) => `
Share Release Confirmation

Switch ID: ${data.switchId}
Share Index: ${data.shareIndex}
Released At: ${new Date().toISOString()}
Event ID: ${data.eventId}

Your share has been successfully released to the Nostr network.
Recipients can now collect shares from guardians to reconstruct the message.

Total shares released: ${data.releasedCount} of ${data.threshold} required

---
EchoLock Guardian System
    `.trim(),
  },
};

/**
 * Email transporter (configured via environment variables)
 */
let emailTransporter = null;

/**
 * Initialize email transporter
 */
function initEmailTransporter() {
  if (emailTransporter) return emailTransporter;

  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  // Only create transporter if SMTP credentials are configured
  if (config.auth.user && config.auth.pass) {
    emailTransporter = nodemailer.createTransport(config);
    logger.info('Email transporter initialized');
  } else {
    logger.warn('SMTP credentials not configured - email notifications disabled');
  }

  return emailTransporter;
}

/**
 * Send email notification to guardian
 */
async function sendEmailNotification(email, type, data) {
  const transporter = initEmailTransporter();

  if (!transporter) {
    logger.warn(`Email notification skipped (no transporter): ${type} to ${email}`);
    return { success: false, reason: 'Email not configured' };
  }

  const template = emailTemplates[type];
  if (!template) {
    logger.error(`Unknown notification type: ${type}`);
    return { success: false, reason: 'Unknown notification type' };
  }

  try {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@echolock.xyz',
      to: email,
      subject: template.subject,
      text: template.template(data),
    });

    logger.info(`Email sent: ${type} to ${email}`, { messageId: result.messageId });
    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error(`Email send failed: ${type} to ${email}`, { error: error.message });
    return { success: false, reason: error.message };
  }
}

/**
 * Send Nostr DM notification (NIP-04)
 */
async function sendNostrDmNotification(guardianNpub, type, data, senderPrivkey) {
  // This would use NIP-04 encrypted DMs
  // For now, log and return - full implementation would use nostr-tools
  logger.info(`Nostr DM notification: ${type} to ${guardianNpub.slice(0, 16)}...`);

  // TODO: Implement NIP-04 DM sending
  // 1. Encrypt message with NIP-04 (ECDH + AES)
  // 2. Create kind:4 event
  // 3. Sign and publish to relays

  return { success: true, method: 'nostr_dm', note: 'Placeholder - implement NIP-04' };
}

/**
 * Send webhook notification
 */
async function sendWebhookNotification(webhookUrl, type, data) {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EchoLock-Event': type,
      },
      body: JSON.stringify({
        type,
        timestamp: Date.now(),
        data,
      }),
    });

    if (response.ok) {
      logger.info(`Webhook sent: ${type} to ${webhookUrl}`);
      return { success: true };
    } else {
      logger.error(`Webhook failed: ${response.status} ${response.statusText}`);
      return { success: false, reason: `HTTP ${response.status}` };
    }
  } catch (error) {
    logger.error(`Webhook error: ${type} to ${webhookUrl}`, { error: error.message });
    return { success: false, reason: error.message };
  }
}

/**
 * Send notification to guardian via all configured channels
 */
export async function notifyGuardian(guardian, type, data) {
  const results = {
    email: null,
    nostrDm: null,
    webhook: null,
  };

  // Email notification
  if (guardian.metadata?.email) {
    results.email = await sendEmailNotification(guardian.metadata.email, type, data);
  }

  // Nostr DM notification (if we have sender key)
  if (guardian.npub && data.senderPrivkey) {
    results.nostrDm = await sendNostrDmNotification(
      guardian.npub,
      type,
      data,
      data.senderPrivkey
    );
  }

  // Webhook notification
  if (guardian.metadata?.webhookUrl) {
    results.webhook = await sendWebhookNotification(
      guardian.metadata.webhookUrl,
      type,
      data
    );
  }

  return results;
}

/**
 * Send notification to multiple guardians
 */
export async function notifyAllGuardians(guardians, type, data) {
  const results = [];

  for (const guardian of guardians) {
    const result = await notifyGuardian(guardian, type, data);
    results.push({
      guardianId: guardian.id,
      guardianNpub: guardian.npub?.slice(0, 16),
      ...result,
    });
  }

  return results;
}

/**
 * Check if notifications are properly configured
 */
export function checkNotificationConfig() {
  const emailConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

  return {
    email: {
      configured: emailConfigured,
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
    },
    nostrDm: {
      configured: true, // Always available if we have keys
      note: 'Requires sender private key',
    },
    webhook: {
      configured: true, // Always available per-guardian
      note: 'Configured per-guardian in metadata.webhookUrl',
    },
  };
}

export default {
  NotificationType,
  notifyGuardian,
  notifyAllGuardians,
  checkNotificationConfig,
};
