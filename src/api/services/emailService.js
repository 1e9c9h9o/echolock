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
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { query } from '../db/connection.js';

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
  const verificationUrl = `${FRONTEND_URL}/auth/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@700;800&display=swap');
          body {
            font-family: 'IBM Plex Mono', 'Courier New', monospace;
            line-height: 1.5;
            color: #0A0A0A;
            font-size: 14px;
            letter-spacing: -0.01em;
            background: #7BA3C9;
            margin: 0;
            padding: 20px;
          }
          h1, h2, h3 {
            font-family: 'IBM Plex Sans', Arial, sans-serif;
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.1;
            margin: 0;
          }
          .container { max-width: 600px; margin: 0 auto; }
          .hazard-stripe {
            height: 12px;
            background: repeating-linear-gradient(-45deg, #FFD000, #FFD000 10px, #1A1A1A 10px, #1A1A1A 20px);
          }
          .header {
            background: #1A1A1A;
            color: white;
            padding: 24px 20px;
          }
          .header-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #FF6B00;
            margin-bottom: 8px;
          }
          .header h1 { font-size: 24px; color: white; }
          .content {
            padding: 30px;
            background: white;
            border: 4px solid #0A0A0A;
            border-top: none;
          }
          .btn {
            display: inline-block;
            padding: 14px 28px;
            background: #FF6B00;
            color: white;
            text-decoration: none;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .link-box {
            background: #F5F5F5;
            padding: 12px 16px;
            margin: 20px 0;
            border-left: 4px solid #7BA3C9;
            font-size: 12px;
            word-break: break-all;
          }
          .note {
            margin-top: 24px;
            padding-top: 24px;
            border-top: 2px solid #7BA3C9;
            font-size: 12px;
            opacity: 0.7;
          }
          .footer {
            background: #1A1A1A;
            color: white;
            text-align: center;
            font-size: 11px;
            padding: 20px;
            opacity: 0.7;
          }
          .footer p { margin: 4px 0; }
          .footer-accent { color: #FF6B00; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="hazard-stripe"></div>
          <div class="header">
            <div class="header-label">Account Setup</div>
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <p>Thank you for signing up for EchoLock. Please verify your email address to activate your account.</p>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${verificationUrl}" class="btn">Verify Email Address</a>
            </p>

            <div class="link-box">
              <strong style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6;">Or copy this link:</strong><br>
              <a href="${verificationUrl}" style="color: #0A0A0A;">${verificationUrl}</a>
            </div>

            <div class="note">
              This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
            </div>
          </div>
          <div class="hazard-stripe"></div>
          <div class="footer">
            <p><span class="footer-accent">EchoLock</span> · Censorship-resistant dead man's switch</p>
            <p>&copy; ${new Date().getFullYear()} EchoLock</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
ECHOLOCK - VERIFY YOUR EMAIL

Thank you for signing up. Please verify your email address:

${verificationUrl}

This link expires in 24 hours.

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
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@700;800&display=swap');
          body {
            font-family: 'IBM Plex Mono', 'Courier New', monospace;
            line-height: 1.5;
            color: #0A0A0A;
            font-size: 14px;
            letter-spacing: -0.01em;
            background: #7BA3C9;
            margin: 0;
            padding: 20px;
          }
          h1, h2, h3 {
            font-family: 'IBM Plex Sans', Arial, sans-serif;
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.1;
            margin: 0;
          }
          .container { max-width: 600px; margin: 0 auto; }
          .hazard-stripe {
            height: 12px;
            background: repeating-linear-gradient(-45deg, #FFD000, #FFD000 10px, #1A1A1A 10px, #1A1A1A 20px);
          }
          .header {
            background: #1A1A1A;
            color: white;
            padding: 24px 20px;
          }
          .header-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #FF6B00;
            margin-bottom: 8px;
          }
          .header h1 { font-size: 24px; color: white; }
          .content {
            padding: 30px;
            background: white;
            border: 4px solid #0A0A0A;
            border-top: none;
          }
          .btn {
            display: inline-block;
            padding: 14px 28px;
            background: #FF6B00;
            color: white;
            text-decoration: none;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .link-box {
            background: #F5F5F5;
            padding: 12px 16px;
            margin: 20px 0;
            border-left: 4px solid #7BA3C9;
            font-size: 12px;
            word-break: break-all;
          }
          .note {
            margin-top: 24px;
            padding-top: 24px;
            border-top: 2px solid #7BA3C9;
            font-size: 12px;
            opacity: 0.7;
          }
          .footer {
            background: #1A1A1A;
            color: white;
            text-align: center;
            font-size: 11px;
            padding: 20px;
            opacity: 0.7;
          }
          .footer p { margin: 4px 0; }
          .footer-accent { color: #FF6B00; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="hazard-stripe"></div>
          <div class="header">
            <div class="header-label">Security</div>
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <p>You requested to reset your password. Click the button below to create a new password.</p>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${resetUrl}" class="btn">Reset Password</a>
            </p>

            <div class="link-box">
              <strong style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6;">Or copy this link:</strong><br>
              <a href="${resetUrl}" style="color: #0A0A0A;">${resetUrl}</a>
            </div>

            <div class="note">
              This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </div>
          </div>
          <div class="hazard-stripe"></div>
          <div class="footer">
            <p><span class="footer-accent">EchoLock</span> · Censorship-resistant dead man's switch</p>
            <p>&copy; ${new Date().getFullYear()} EchoLock</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
ECHOLOCK - RESET YOUR PASSWORD

You requested to reset your password. Click the link below:

${resetUrl}

This link expires in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

---
EchoLock - Censorship-resistant dead man's switch
  `;

  return await sendEmail(email, 'Reset your EchoLock password', html, text);
}

/**
 * Create a release token for a recipient to view their message online
 * @param {Object} params - Token parameters
 * @returns {Promise<string>} The generated token
 */
export async function createReleaseToken({
  switchId,
  recipientId,
  recipientEmail,
  messageContent,
  senderName,
  senderEmail,
  switchTitle,
  expiresInDays = 30
}) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  try {
    await query(
      `INSERT INTO release_tokens
        (switch_id, recipient_id, token, recipient_email, message_content,
         sender_name, sender_email, switch_title, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [switchId, recipientId, token, recipientEmail, messageContent,
       senderName, senderEmail, switchTitle, expiresAt]
    );
    logger.info('Created release token', { switchId, recipientEmail, token: token.substring(0, 8) + '...' });
    return token;
  } catch (error) {
    logger.error('Failed to create release token:', error);
    return null;
  }
}

/**
 * Send dead man's switch release message
 * @param {string} email - Recipient email
 * @param {string} message - The secret message
 * @param {string} switchTitle - Title of the switch
 * @param {string} triggerReason - Why it was triggered
 * @param {Object} options - Optional parameters
 * @param {string} options.viewToken - Token for viewing message online
 */
export async function sendSwitchReleaseEmail(email, message, switchTitle, triggerReason = 'Timer expired', options = {}) {
  const { viewToken } = options;
  const viewUrl = viewToken ? `${FRONTEND_URL}/message/${viewToken}` : null;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@700;800&display=swap');
          body {
            font-family: 'IBM Plex Mono', 'Courier New', monospace;
            line-height: 1.5;
            color: #0A0A0A;
            font-size: 14px;
            letter-spacing: -0.01em;
            background: #7BA3C9;
            margin: 0;
            padding: 20px;
          }
          h1, h2, h3 {
            font-family: 'IBM Plex Sans', Arial, sans-serif;
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.1;
            margin: 0;
          }
          .container { max-width: 600px; margin: 0 auto; }
          .hazard-stripe {
            height: 12px;
            background: repeating-linear-gradient(
              -45deg,
              #FFD000,
              #FFD000 10px,
              #1A1A1A 10px,
              #1A1A1A 20px
            );
          }
          .header {
            background: #1A1A1A;
            color: white;
            padding: 24px 20px;
          }
          .header-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #FF6B00;
            margin-bottom: 8px;
          }
          .header h1 {
            font-size: 24px;
            color: white;
          }
          .content {
            padding: 30px;
            background: white;
            border: 4px solid #0A0A0A;
            border-top: none;
          }
          .trigger-box {
            background: #7BA3C9;
            padding: 12px 16px;
            margin-bottom: 24px;
            border-left: 4px solid #FF6B00;
          }
          .trigger-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            opacity: 0.6;
            margin-bottom: 4px;
          }
          .message-box {
            background: #F5F5F5;
            padding: 20px;
            margin: 24px 0;
            border: 4px solid #0A0A0A;
          }
          .message-header {
            background: #0A0A0A;
            color: white;
            padding: 8px 12px;
            margin: -20px -20px 16px -20px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
          }
          .message-content {
            white-space: pre-wrap;
            font-family: 'IBM Plex Mono', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
          }
          .view-online {
            text-align: center;
            margin: 24px 0;
            padding: 20px;
            background: #7BA3C9;
            border: 4px solid #0A0A0A;
          }
          .btn {
            display: inline-block;
            padding: 14px 28px;
            background: #FF6B00;
            color: white;
            text-decoration: none;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            border: none;
          }
          .btn:hover {
            background: #FFD000;
            color: #0A0A0A;
          }
          .explainer {
            margin-top: 24px;
            padding-top: 24px;
            border-top: 2px solid #7BA3C9;
            font-size: 12px;
            opacity: 0.7;
          }
          .footer {
            background: #1A1A1A;
            color: white;
            text-align: center;
            font-size: 11px;
            padding: 20px;
            opacity: 0.7;
          }
          .footer p { margin: 4px 0; }
          .footer-accent { color: #FF6B00; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="hazard-stripe"></div>
          <div class="header">
            <div class="header-label">⚠ Switch Triggered</div>
            <h1>${switchTitle}</h1>
          </div>
          <div class="content">
            <div class="trigger-box">
              <div class="trigger-label">Trigger Reason</div>
              <div>${triggerReason}</div>
            </div>

            <p>This message was automatically released because the sender failed to check in before the deadline.</p>

            <div class="message-box">
              <div class="message-header">Message Content</div>
              <div class="message-content">${message}</div>
            </div>

            ${viewUrl ? `
            <div class="view-online">
              <p style="margin: 0 0 12px 0; font-size: 12px;">
                <strong>View this message online:</strong>
              </p>
              <a href="${viewUrl}" class="btn">View Message</a>
              <p style="margin: 12px 0 0 0; font-size: 10px; opacity: 0.7;">
                Link expires in 30 days
              </p>
            </div>
            ` : ''}

            <div class="explainer">
              <strong>What is this?</strong> EchoLock is a dead man's switch service that automatically releases
              pre-written messages if the sender doesn't check in regularly. This ensures important messages
              reach their intended recipients.
            </div>
          </div>
          <div class="hazard-stripe"></div>
          <div class="footer">
            <p><span class="footer-accent">EchoLock</span> · Censorship-resistant dead man's switch</p>
            <p>&copy; ${new Date().getFullYear()} EchoLock · Sent via Nostr protocol</p>
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
${viewUrl ? `
View this message online: ${viewUrl}
(Link expires in 30 days)
` : ''}
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
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@700;800&display=swap');
          body {
            font-family: 'IBM Plex Mono', 'Courier New', monospace;
            line-height: 1.5;
            color: #0A0A0A;
            font-size: 14px;
            letter-spacing: -0.01em;
            background: #7BA3C9;
            margin: 0;
            padding: 20px;
          }
          h1, h2, h3 {
            font-family: 'IBM Plex Sans', Arial, sans-serif;
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.1;
            margin: 0;
          }
          .container { max-width: 600px; margin: 0 auto; }
          .hazard-stripe {
            height: 12px;
            background: repeating-linear-gradient(-45deg, #FFD000, #FFD000 10px, #1A1A1A 10px, #1A1A1A 20px);
          }
          .header {
            background: #1A1A1A;
            color: white;
            padding: 24px 20px;
          }
          .header-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #FFD000;
            margin-bottom: 8px;
          }
          .header h1 { font-size: 24px; color: white; }
          .content {
            padding: 30px;
            background: white;
            border: 4px solid #0A0A0A;
            border-top: none;
          }
          .time-box {
            background: #FFD000;
            padding: 20px;
            text-align: center;
            margin: 24px 0;
            border: 4px solid #0A0A0A;
          }
          .time-number {
            font-family: 'IBM Plex Sans', Arial, sans-serif;
            font-size: 48px;
            font-weight: 700;
            color: #0A0A0A;
            line-height: 1;
          }
          .time-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-top: 8px;
          }
          .btn {
            display: inline-block;
            padding: 14px 28px;
            background: #FF6B00;
            color: white;
            text-decoration: none;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .warning-text {
            background: #7BA3C9;
            padding: 12px 16px;
            margin-top: 24px;
            border-left: 4px solid #FF6B00;
            font-size: 12px;
          }
          .footer {
            background: #1A1A1A;
            color: white;
            text-align: center;
            font-size: 11px;
            padding: 20px;
            opacity: 0.7;
          }
          .footer p { margin: 4px 0; }
          .footer-accent { color: #FF6B00; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="hazard-stripe"></div>
          <div class="header">
            <div class="header-label">⏰ Check-In Required</div>
            <h1>${switchTitle}</h1>
          </div>
          <div class="content">
            <p>Your dead man's switch needs a check-in.</p>

            <div class="time-box">
              <div class="time-number">${hoursRemaining}</div>
              <div class="time-label">hours remaining</div>
            </div>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${dashboardUrl}" class="btn">Check In Now</a>
            </p>

            <div class="warning-text">
              If you don't check in before the deadline, your message will be automatically released to your recipients.
            </div>
          </div>
          <div class="hazard-stripe"></div>
          <div class="footer">
            <p><span class="footer-accent">EchoLock</span> · Censorship-resistant dead man's switch</p>
            <p>&copy; ${new Date().getFullYear()} EchoLock</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
ECHOLOCK - CHECK-IN REMINDER

Switch: ${switchTitle}
Time remaining: ${hoursRemaining} hours

Your dead man's switch needs a check-in.

Check in now: ${dashboardUrl}

If you don't check in before the deadline, your message will be automatically released.

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
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@700;800&display=swap');
          body {
            font-family: 'IBM Plex Mono', 'Courier New', monospace;
            line-height: 1.5;
            color: #0A0A0A;
            font-size: 14px;
            letter-spacing: -0.01em;
            background: #7BA3C9;
            margin: 0;
            padding: 20px;
          }
          h1, h2, h3 {
            font-family: 'IBM Plex Sans', Arial, sans-serif;
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.1;
            margin: 0;
          }
          .container { max-width: 600px; margin: 0 auto; }
          .test-stripe {
            height: 12px;
            background: repeating-linear-gradient(-45deg, #7BA3C9, #7BA3C9 10px, #1A1A1A 10px, #1A1A1A 20px);
          }
          .header {
            background: #1A1A1A;
            color: white;
            padding: 24px 20px;
          }
          .header-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #7BA3C9;
            margin-bottom: 8px;
          }
          .header h1 { font-size: 24px; color: white; }
          .content {
            padding: 30px;
            background: white;
            border: 4px solid #0A0A0A;
            border-top: none;
          }
          .test-banner {
            background: #7BA3C9;
            padding: 16px;
            text-align: center;
            margin: 20px 0;
            border: 4px solid #0A0A0A;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .info-box {
            background: #F5F5F5;
            padding: 16px;
            margin: 20px 0;
            border-left: 4px solid #7BA3C9;
          }
          .footer {
            background: #1A1A1A;
            color: white;
            text-align: center;
            font-size: 11px;
            padding: 20px;
            opacity: 0.7;
          }
          .footer p { margin: 4px 0; }
          .footer-accent { color: #FF6B00; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="test-stripe"></div>
          <div class="header">
            <div class="header-label">🔔 Test Drill</div>
            <h1>${switchTitle}</h1>
          </div>
          <div class="content">
            <div class="test-banner">
              ⚠ This is a test · Not a real trigger
            </div>

            <p>Hello ${recipientName},</p>

            <p>The owner of this dead man's switch has run a test drill.</p>

            <div class="info-box">
              <strong>This is only a test.</strong> No actual message has been released. The switch owner is verifying that their system is configured correctly and that you would receive notifications if needed.
            </div>

            <p>If you have questions about this test, please contact the person who set you up as a recipient.</p>

            <div class="test-banner">
              No action required
            </div>
          </div>
          <div class="test-stripe"></div>
          <div class="footer">
            <p><span class="footer-accent">EchoLock</span> · Censorship-resistant dead man's switch</p>
            <p>&copy; ${new Date().getFullYear()} EchoLock</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
ECHOLOCK TEST DRILL

⚠ THIS IS A TEST - NOT A REAL TRIGGER

Hello ${recipientName},

The owner of the dead man's switch "${switchTitle}" has run a test drill.

This is only a test. No actual message has been released. The switch owner is verifying that their system is configured correctly.

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
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@700;800&display=swap');
          body {
            font-family: 'IBM Plex Mono', 'Courier New', monospace;
            line-height: 1.5;
            color: #0A0A0A;
            font-size: 14px;
            letter-spacing: -0.01em;
            background: #7BA3C9;
            margin: 0;
            padding: 20px;
          }
          h1, h2, h3 {
            font-family: 'IBM Plex Sans', Arial, sans-serif;
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.1;
            margin: 0;
          }
          .container { max-width: 600px; margin: 0 auto; }
          .hazard-stripe {
            height: 12px;
            background: repeating-linear-gradient(-45deg, #FFD000, #FFD000 10px, #1A1A1A 10px, #1A1A1A 20px);
          }
          .header {
            background: #1A1A1A;
            color: white;
            padding: 24px 20px;
          }
          .header-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #FF6B00;
            margin-bottom: 8px;
          }
          .header h1 { font-size: 24px; color: white; }
          .content {
            padding: 30px;
            background: white;
            border: 4px solid #0A0A0A;
            border-top: none;
          }
          .btn-large {
            display: inline-block;
            padding: 20px 40px;
            background: #FF6B00;
            color: white;
            text-decoration: none;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .expires-box {
            background: #F5F5F5;
            padding: 12px 16px;
            margin: 20px 0;
            text-align: center;
            font-size: 12px;
            border: 2px solid #0A0A0A;
          }
          .security-note {
            margin-top: 24px;
            padding-top: 24px;
            border-top: 2px solid #7BA3C9;
            font-size: 11px;
            opacity: 0.6;
          }
          .footer {
            background: #1A1A1A;
            color: white;
            text-align: center;
            font-size: 11px;
            padding: 20px;
            opacity: 0.7;
          }
          .footer p { margin: 4px 0; }
          .footer-accent { color: #FF6B00; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="hazard-stripe"></div>
          <div class="header">
            <div class="header-label">Quick Action</div>
            <h1>${switchTitle}</h1>
          </div>
          <div class="content">
            <p>Click the button below to instantly check in to your switch.</p>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${checkInUrl}" class="btn-large">✓ Check In Now</a>
            </p>

            <div class="expires-box">
              <strong style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;">Link expires:</strong><br>
              ${expiresText}
            </div>

            <div class="security-note">
              <strong>Security note:</strong> This link can only be used once and is tied to your account. Do not share this link with anyone.
            </div>
          </div>
          <div class="hazard-stripe"></div>
          <div class="footer">
            <p><span class="footer-accent">EchoLock</span> · Censorship-resistant dead man's switch</p>
            <p>&copy; ${new Date().getFullYear()} EchoLock</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
ECHOLOCK - QUICK CHECK-IN

Switch: ${switchTitle}

Click the link below to check in:

${checkInUrl}

Link expires: ${expiresText}

Security note: This link can only be used once. Do not share it.

---
EchoLock - Censorship-resistant dead man's switch
  `;

  return await sendEmail(email, `✓ Quick Check-In: ${switchTitle}`, html, text);
}

/**
 * Send emergency alert to emergency contact
 * @param {string} email - Contact email
 * @param {string} name - Contact name
 * @param {string} switchTitle - Switch title
 * @param {object} alertType - Alert type with name and label
 * @param {number} hoursRemaining - Hours until trigger
 * @param {string} ackToken - Acknowledgment token
 */
export async function sendEmergencyAlertEmail(email, name, switchTitle, alertType, hoursRemaining, ackToken) {
  const contactName = name || 'Emergency Contact';
  const ackUrl = `${FRONTEND_URL}/acknowledge-alert/${ackToken}`;
  const hoursText = Math.max(0, Math.round(hoursRemaining));

  // Color coding based on alert type - using brand colors
  const colors = {
    WARNING: { accent: '#FFD000', stripe: '#FFD000' },  // Yellow
    URGENT: { accent: '#FF6B00', stripe: '#FF6B00' },   // Orange
    FINAL: { accent: '#FF3B00', stripe: '#FF3B00' }     // Red-orange
  };
  const color = colors[alertType.name] || colors.WARNING;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@700;800&display=swap');
          body {
            font-family: 'IBM Plex Mono', 'Courier New', monospace;
            line-height: 1.5;
            color: #0A0A0A;
            font-size: 14px;
            letter-spacing: -0.01em;
            background: #7BA3C9;
            margin: 0;
            padding: 20px;
          }
          h1, h2, h3 {
            font-family: 'IBM Plex Sans', Arial, sans-serif;
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.1;
            margin: 0;
          }
          .container { max-width: 600px; margin: 0 auto; }
          .alert-stripe {
            height: 12px;
            background: repeating-linear-gradient(-45deg, ${color.stripe}, ${color.stripe} 10px, #1A1A1A 10px, #1A1A1A 20px);
          }
          .header {
            background: #1A1A1A;
            color: white;
            padding: 24px 20px;
          }
          .header-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: ${color.accent};
            margin-bottom: 8px;
          }
          .header h1 { font-size: 24px; color: white; }
          .content {
            padding: 30px;
            background: white;
            border: 4px solid #0A0A0A;
            border-top: none;
          }
          .time-box {
            background: ${color.accent};
            padding: 24px;
            text-align: center;
            margin: 24px 0;
            border: 4px solid #0A0A0A;
          }
          .time-number {
            font-family: 'IBM Plex Sans', Arial, sans-serif;
            font-size: 56px;
            font-weight: 700;
            color: #0A0A0A;
            line-height: 1;
          }
          .time-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-top: 8px;
          }
          .switch-name {
            background: #F5F5F5;
            padding: 12px 16px;
            margin: 20px 0;
            border-left: 4px solid ${color.accent};
          }
          .switch-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            opacity: 0.6;
            margin-bottom: 4px;
          }
          .info-section {
            background: #F5F5F5;
            padding: 16px;
            margin: 20px 0;
            border: 2px solid #0A0A0A;
          }
          .info-section h3 {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-bottom: 12px;
          }
          .info-section ul, .info-section ol {
            margin: 0;
            padding-left: 20px;
          }
          .info-section li {
            margin: 8px 0;
            font-size: 13px;
          }
          .btn {
            display: inline-block;
            padding: 14px 28px;
            background: #FF6B00;
            color: white;
            text-decoration: none;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .ack-note {
            font-size: 11px;
            opacity: 0.6;
            margin-top: 12px;
          }
          .footer {
            background: #1A1A1A;
            color: white;
            text-align: center;
            font-size: 11px;
            padding: 20px;
            opacity: 0.7;
          }
          .footer p { margin: 4px 0; }
          .footer-accent { color: #FF6B00; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="alert-stripe"></div>
          <div class="header">
            <div class="header-label">⚠ ${alertType.label}</div>
            <h1>Emergency Alert</h1>
          </div>
          <div class="content">
            <p>Hello ${contactName},</p>
            <p>You are receiving this alert because you have been designated as an emergency contact for a dead man's switch.</p>

            <div class="switch-name">
              <div class="switch-label">Switch</div>
              <div><strong>${switchTitle}</strong></div>
            </div>

            <div class="time-box">
              <div class="time-number">${hoursText}</div>
              <div class="time-label">hours until trigger</div>
            </div>

            <div class="info-section">
              <h3>This could indicate:</h3>
              <ul>
                <li>They forgot to check in</li>
                <li>They are traveling or busy</li>
                <li>They may need assistance</li>
              </ul>
            </div>

            <div class="info-section">
              <h3>What you should do:</h3>
              <ol>
                <li>Try to contact the switch owner</li>
                <li>If you can confirm they are okay, ask them to check in</li>
                <li>If you cannot reach them, follow any instructions they provided</li>
              </ol>
            </div>

            <p style="text-align: center; margin: 24px 0;">
              <a href="${ackUrl}" class="btn">Acknowledge Alert</a>
            </p>
            <p class="ack-note" style="text-align: center;">
              Clicking acknowledge lets us know you've seen this alert. It does not stop the switch.
            </p>
          </div>
          <div class="alert-stripe"></div>
          <div class="footer">
            <p><span class="footer-accent">EchoLock</span> · Censorship-resistant dead man's switch</p>
            <p>&copy; ${new Date().getFullYear()} EchoLock</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
ECHOLOCK EMERGENCY ALERT - ${alertType.label.toUpperCase()}

Hello ${contactName},

You are receiving this alert because you have been designated as an emergency contact.

Switch: ${switchTitle}
Time until trigger: ${hoursText} hours

The switch owner has not checked in. Please try to contact them.

Acknowledge this alert: ${ackUrl}

---
EchoLock - Censorship-resistant dead man's switch
  `;

  return await sendEmail(
    email,
    `⚠️ [${alertType.label}] EchoLock Alert: ${switchTitle}`,
    html,
    text
  );
}

/**
 * Send test alert to emergency contact
 * @param {string} email - Contact email
 * @param {string} name - Contact name
 */
export async function sendEmergencyTestEmail(email, name) {
  const contactName = name || 'Emergency Contact';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@700;800&display=swap');
          body {
            font-family: 'IBM Plex Mono', 'Courier New', monospace;
            line-height: 1.5;
            color: #0A0A0A;
            font-size: 14px;
            letter-spacing: -0.01em;
            background: #7BA3C9;
            margin: 0;
            padding: 20px;
          }
          h1, h2, h3 {
            font-family: 'IBM Plex Sans', Arial, sans-serif;
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.1;
            margin: 0;
          }
          .container { max-width: 600px; margin: 0 auto; }
          .test-stripe {
            height: 12px;
            background: repeating-linear-gradient(-45deg, #7BA3C9, #7BA3C9 10px, #1A1A1A 10px, #1A1A1A 20px);
          }
          .header {
            background: #1A1A1A;
            color: white;
            padding: 24px 20px;
          }
          .header-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #7BA3C9;
            margin-bottom: 8px;
          }
          .header h1 { font-size: 24px; color: white; }
          .content {
            padding: 30px;
            background: white;
            border: 4px solid #0A0A0A;
            border-top: none;
          }
          .test-banner {
            background: #7BA3C9;
            padding: 16px;
            text-align: center;
            margin: 20px 0;
            border: 4px solid #0A0A0A;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .info-box {
            background: #F5F5F5;
            padding: 16px;
            margin: 20px 0;
            border-left: 4px solid #7BA3C9;
          }
          .info-box h3 {
            font-size: 12px;
            margin-bottom: 8px;
          }
          .footer {
            background: #1A1A1A;
            color: white;
            text-align: center;
            font-size: 11px;
            padding: 20px;
            opacity: 0.7;
          }
          .footer p { margin: 4px 0; }
          .footer-accent { color: #FF6B00; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="test-stripe"></div>
          <div class="header">
            <div class="header-label">🔔 Test Alert</div>
            <h1>Emergency Contact Test</h1>
          </div>
          <div class="content">
            <div class="test-banner">
              ⚠ This is a test · No action required
            </div>

            <p>Hello ${contactName},</p>

            <p>You have been added as an emergency contact on EchoLock, a dead man's switch service.</p>

            <p>The account owner has sent this test alert to verify that you can receive emergency notifications.</p>

            <div class="info-box">
              <h3>What is an emergency contact?</h3>
              <p style="margin: 0; font-size: 13px;">If the account owner fails to check in on their switch, you will receive alerts before the switch triggers. This gives you an opportunity to check on their wellbeing or follow any instructions they've given you.</p>
            </div>

            <div class="test-banner">
              No action required · This is just a test
            </div>

            <p style="font-size: 12px; opacity: 0.7;">If you have questions about why you received this, please contact the person who added you as an emergency contact.</p>
          </div>
          <div class="test-stripe"></div>
          <div class="footer">
            <p><span class="footer-accent">EchoLock</span> · Censorship-resistant dead man's switch</p>
            <p>&copy; ${new Date().getFullYear()} EchoLock</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
ECHOLOCK TEST ALERT

⚠ THIS IS A TEST - NO ACTION REQUIRED

Hello ${contactName},

You have been added as an emergency contact on EchoLock.

The account owner has sent this test alert to verify you can receive notifications.

NO ACTION REQUIRED - THIS IS JUST A TEST

---
EchoLock - Censorship-resistant dead man's switch
  `;

  return await sendEmail(email, '🔔 [TEST] EchoLock Emergency Contact Alert', html, text);
}

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSwitchReleaseEmail,
  sendCheckInReminder,
  sendTestDrillEmail,
  sendQuickCheckInLink,
  sendEmergencyAlertEmail,
  sendEmergencyTestEmail,
  createReleaseToken
};
