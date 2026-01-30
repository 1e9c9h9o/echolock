'use strict';

/**
 * Email Service
 *
 * Handles all email sending through Resend.com
 *
 * Email Types:
 * - Email verification
 * - Password reset
 * - Dead man's switch release
 * - Check-in reminders (future)
 *
 * Configuration:
 * - RESEND_API_KEY: API key from Resend.com
 * - FRONTEND_URL: Base URL for email links
 */

import { Resend } from 'resend';
import { logger } from '../utils/logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const FROM_EMAIL = process.env.FROM_EMAIL || 'EchoLock <noreply@echolock.xyz>';

if (!RESEND_API_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('RESEND_API_KEY environment variable is required in production');
}

// Initialize Resend client
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

if (!resend) {
  logger.warn('Resend not configured - emails will be logged only');
}

/**
 * Send email with error handling and logging
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Plain text content (fallback)
 */
async function sendEmail(to, subject, html, text) {
  try {
    if (!resend) {
      // Development mode - log instead of sending
      logger.info('📧 [EMAIL] Would send:', {
        to,
        subject,
        text: text.substring(0, 100) + '...'
      });
      return { success: true, id: 'dev-mode' };
    }

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text
    });

    logger.info('Email sent successfully', {
      to,
      subject,
      messageId: result.id
    });

    return { success: true, id: result.id };
  } catch (error) {
    logger.error('Failed to send email:', {
      to,
      subject,
      error: error.message
    });
    throw error;
  }
}

/**
 * Send email verification link
 * @param {string} email - User email
 * @param {string} token - Verification token
 */
export async function sendVerificationEmail(email, token) {
  const verificationUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a1a; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 EchoLock</h1>
          </div>
          <div class="content">
            <h2>Welcome to EchoLock!</h2>
            <p>Thank you for signing up. Please verify your email address to activate your account.</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${verificationUrl}">${verificationUrl}</a>
            </p>
            <p style="color: #666; font-size: 12px;">
              This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>EchoLock - Censorship-resistant dead man's switch</p>
            <p>&copy; ${new Date().getFullYear()} EchoLock. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Welcome to EchoLock!

Please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

---
EchoLock - Censorship-resistant dead man's switch
  `;

  return await sendEmail(email, 'Verify your EchoLock account', html, text);
}

/**
 * Send password reset link
 * @param {string} email - User email
 * @param {string} token - Reset token
 */
export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a1a; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #f44336; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 EchoLock</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>You requested to reset your password. Click the button below to create a new password.</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetUrl}">${resetUrl}</a>
            </p>
            <p style="color: #666; font-size: 12px;">
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>EchoLock - Censorship-resistant dead man's switch</p>
            <p>&copy; ${new Date().getFullYear()} EchoLock. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Reset Your Password

You requested to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

---
EchoLock - Censorship-resistant dead man's switch
  `;

  return await sendEmail(email, 'Reset your EchoLock password', html, text);
}

/**
 * Send dead man's switch release message
 * @param {string} email - Recipient email
 * @param {string} message - The secret message
 * @param {string} switchTitle - Title of the switch
 * @param {string} triggerReason - Why it was triggered
 */
export async function sendSwitchReleaseEmail(email, message, switchTitle, triggerReason = 'Timer expired') {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #d32f2f; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #fff3cd; border: 2px solid #ffc107; }
          .message-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #d32f2f; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ EchoLock Dead Man's Switch Triggered</h1>
          </div>
          <div class="content">
            <h2>Important Message from: ${switchTitle}</h2>
            <p><strong>Trigger Reason:</strong> ${triggerReason}</p>
            <p>This message was automatically released because the sender failed to check in before the deadline.</p>

            <div class="message-box">
              <h3>Message:</h3>
              <div style="white-space: pre-wrap; font-family: 'Courier New', monospace;">${message}</div>
            </div>

            <p style="color: #666; font-size: 12px;">
              <strong>What is this?</strong> EchoLock is a dead man's switch service that automatically releases
              pre-written messages if the sender doesn't check in regularly. This protects sensitive information
              and ensures important messages reach their intended recipients even if something happens to the sender.
            </p>
          </div>
          <div class="footer">
            <p>EchoLock - Censorship-resistant dead man's switch</p>
            <p>&copy; ${new Date().getFullYear()} EchoLock. All rights reserved.</p>
            <p>This email was sent securely via Nostr protocol</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
⚠️ ECHOLOCK DEAD MAN'S SWITCH TRIGGERED ⚠️

Title: ${switchTitle}
Trigger Reason: ${triggerReason}

This message was automatically released because the sender failed to check in before the deadline.

--- MESSAGE ---

${message}

--- END MESSAGE ---

What is this?
EchoLock is a dead man's switch service that automatically releases pre-written messages if the sender doesn't check in regularly.

---
EchoLock - Censorship-resistant dead man's switch
This email was sent securely via Nostr protocol
  `;

  return await sendEmail(
    email,
    `⚠️ Dead Man's Switch Triggered: ${switchTitle}`,
    html,
    text
  );
}

/**
 * Send check-in reminder (future feature)
 * @param {string} email - User email
 * @param {string} switchTitle - Switch title
 * @param {number} hoursRemaining - Hours until trigger
 */
export async function sendCheckInReminder(email, switchTitle, hoursRemaining) {
  const dashboardUrl = `${FRONTEND_URL}/dashboard`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #fff3cd; }
          .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ EchoLock Check-In Reminder</h1>
          </div>
          <div class="content">
            <h2>Time to Check In!</h2>
            <p>Your dead man's switch "${switchTitle}" needs a check-in.</p>
            <p><strong>Time remaining: ${hoursRemaining} hours</strong></p>
            <p>If you don't check in before the deadline, your message will be automatically released to your recipients.</p>
            <p style="text-align: center;">
              <a href="${dashboardUrl}" class="button">Check In Now</a>
            </p>
          </div>
          <div class="footer">
            <p>EchoLock - Censorship-resistant dead man's switch</p>
            <p>&copy; ${new Date().getFullYear()} EchoLock. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
⏰ ECHOLOCK CHECK-IN REMINDER

Your dead man's switch "${switchTitle}" needs a check-in.

Time remaining: ${hoursRemaining} hours

If you don't check in before the deadline, your message will be automatically released.

Check in now: ${dashboardUrl}

---
EchoLock - Censorship-resistant dead man's switch
  `;

  return await sendEmail(email, `⏰ Check-in reminder: ${switchTitle}`, html, text);
}

/**
 * Send test drill notification to recipient
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} switchTitle - Switch title
 */
export async function sendTestDrillEmail(email, name, switchTitle) {
  const recipientName = name || email.split('@')[0];

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
          .test-banner { background: #e3f2fd; border: 3px dashed #2196F3; padding: 15px; text-align: center; margin: 20px 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 EchoLock Test Drill</h1>
          </div>
          <div class="content">
            <div class="test-banner">
              <strong>⚠️ THIS IS A TEST - NOT A REAL TRIGGER ⚠️</strong>
            </div>
            <h2>Hello ${recipientName},</h2>
            <p>The owner of the dead man's switch "${switchTitle}" has run a test drill.</p>
            <p><strong>This is only a test.</strong> No actual message has been released. The switch owner is simply verifying that their system is configured correctly and that you would receive notifications if needed.</p>
            <p>If you have any questions about this test, please contact the person who set you up as a recipient.</p>
            <div class="test-banner">
              <strong>NO ACTION REQUIRED</strong>
            </div>
          </div>
          <div class="footer">
            <p>EchoLock - Censorship-resistant dead man's switch</p>
            <p>&copy; ${new Date().getFullYear()} EchoLock. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
🔔 ECHOLOCK TEST DRILL

⚠️ THIS IS A TEST - NOT A REAL TRIGGER ⚠️

Hello ${recipientName},

The owner of the dead man's switch "${switchTitle}" has run a test drill.

This is only a test. No actual message has been released. The switch owner is simply verifying that their system is configured correctly.

NO ACTION REQUIRED

---
EchoLock - Censorship-resistant dead man's switch
  `;

  return await sendEmail(email, `🔔 [TEST] EchoLock Drill: ${switchTitle}`, html, text);
}

/**
 * Send quick check-in link via email
 * @param {string} email - User email
 * @param {string} switchTitle - Switch title
 * @param {string} checkInUrl - One-click check-in URL
 * @param {Date} expiresAt - When the link expires
 */
export async function sendQuickCheckInLink(email, switchTitle, checkInUrl, expiresAt) {
  const expiresText = expiresAt.toLocaleString();

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a1a; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; padding: 16px 32px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; font-size: 18px; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 EchoLock Quick Check-In</h1>
          </div>
          <div class="content">
            <h2>One-Click Check-In</h2>
            <p>Click the button below to instantly check in to your switch "${switchTitle}".</p>
            <p style="text-align: center;">
              <a href="${checkInUrl}" class="button">✓ CHECK IN NOW</a>
            </p>
            <p style="color: #666; font-size: 14px; text-align: center;">
              This link expires: ${expiresText}
            </p>
            <p style="color: #999; font-size: 12px;">
              Security note: This link can only be used once and is tied to your account.
              Do not share this link with anyone.
            </p>
          </div>
          <div class="footer">
            <p>EchoLock - Censorship-resistant dead man's switch</p>
            <p>&copy; ${new Date().getFullYear()} EchoLock. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
🔒 ECHOLOCK QUICK CHECK-IN

Click the link below to check in to "${switchTitle}":

${checkInUrl}

This link expires: ${expiresText}

Security note: This link can only be used once. Do not share it with anyone.

---
EchoLock - Censorship-resistant dead man's switch
  `;

  return await sendEmail(email, `✓ Quick Check-In: ${switchTitle}`, html, text);
}

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSwitchReleaseEmail,
  sendCheckInReminder,
  sendTestDrillEmail,
  sendQuickCheckInLink
};
