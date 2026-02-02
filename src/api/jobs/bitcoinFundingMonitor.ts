'use strict';

/**
 * Bitcoin Funding Monitor - Cron Job
 *
 * Monitors pending Bitcoin commitments for funding
 *
 * Runs every 2 minutes to check for funded commitments:
 * - Queries switches with bitcoin_status = 'pending'
 * - Checks Blockstream API for transactions to the address
 * - Updates status to 'confirmed' when funded
 * - Sends WebSocket notification to user
 *
 * @see CLAUDE.md - Phase 4: Bitcoin Commitments
 */

import cron, { ScheduledTask } from 'node-cron';
import { query } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import websocketService from '../services/websocketService.js';

// API endpoints
const BLOCKSTREAM_TESTNET = 'https://blockstream.info/testnet/api';
const BLOCKSTREAM_MAINNET = 'https://blockstream.info/api';

// Rate limiting
const API_DELAY_MS = 500; // Delay between API calls to avoid rate limiting

/**
 * Types
 */
interface FundingInfo {
  txid: string;
  vout: number;
  amount: number;
  confirmed: boolean;
  blockHeight: number | null;
  blockTime: number | null;
  explorerUrl: string;
}

interface CommitmentRow {
  id: string;
  user_id: string;
  title: string;
  bitcoin_address: string;
  bitcoin_network: string | null;
  bitcoin_amount: number | null;
  bitcoin_txid?: string;
}

interface BlockstreamTransaction {
  txid: string;
  vout: Array<{
    scriptpubkey_address?: string;
    value: number;
  }>;
  status?: {
    confirmed?: boolean;
    block_height?: number;
    block_time?: number;
  };
}

/**
 * Check if an address has been funded
 */
export async function checkAddressFunded(address: string, network: string = 'testnet'): Promise<FundingInfo | null> {
  const baseUrl = network === 'mainnet' ? BLOCKSTREAM_MAINNET : BLOCKSTREAM_TESTNET;

  try {
    // Fetch transactions for this address
    const response = await fetch(`${baseUrl}/address/${address}/txs`);

    if (!response.ok) {
      if (response.status === 404) {
        // No transactions yet
        return null;
      }
      throw new Error(`API error: ${response.status}`);
    }

    const transactions = await response.json() as BlockstreamTransaction[];

    if (!transactions || transactions.length === 0) {
      return null;
    }

    // Find a transaction that funds this address
    for (const tx of transactions) {
      for (let i = 0; i < tx.vout.length; i++) {
        const output = tx.vout[i];
        if (output.scriptpubkey_address === address) {
          // Found a funding transaction
          const explorerUrl = network === 'mainnet'
            ? `https://mempool.space/tx/${tx.txid}`
            : `https://mempool.space/testnet/tx/${tx.txid}`;

          return {
            txid: tx.txid,
            vout: i,
            amount: output.value,
            confirmed: tx.status?.confirmed || false,
            blockHeight: tx.status?.block_height || null,
            blockTime: tx.status?.block_time || null,
            explorerUrl
          };
        }
      }
    }

    return null;
  } catch (err) {
    const error = err as Error;
    logger.error('Error checking address funding:', {
      address,
      network,
      error: error.message
    });
    return null;
  }
}

/**
 * Check all pending Bitcoin commitments
 */
export async function checkPendingCommitments(): Promise<void> {
  try {
    logger.debug('Bitcoin funding monitor: Checking pending commitments');

    // Find all switches with pending Bitcoin commitments
    const result = await query<CommitmentRow>(
      `SELECT
        s.id,
        s.user_id,
        s.title,
        s.bitcoin_address,
        s.bitcoin_network,
        s.bitcoin_amount
       FROM switches s
       WHERE s.bitcoin_status = 'pending'
         AND s.bitcoin_address IS NOT NULL
         AND s.status = 'ARMED'
       ORDER BY s.created_at ASC`
    );

    const pendingCommitments = result.rows;

    if (pendingCommitments.length === 0) {
      logger.debug('No pending Bitcoin commitments to check');
      return;
    }

    logger.info(`Checking ${pendingCommitments.length} pending Bitcoin commitment(s)`);

    // Check each commitment
    for (const commitment of pendingCommitments) {
      await checkAndUpdateCommitment(commitment);

      // Rate limiting - wait between API calls
      await new Promise(resolve => setTimeout(resolve, API_DELAY_MS));
    }

    logger.debug('Bitcoin funding monitor: Check completed');
  } catch (err) {
    const error = err as Error;
    logger.error('Bitcoin funding monitor error:', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Check a single commitment and update if funded
 */
async function checkAndUpdateCommitment(commitment: CommitmentRow): Promise<void> {
  const { id: switchId, user_id: userId, title, bitcoin_address: address, bitcoin_network: network } = commitment;

  try {
    logger.debug('Checking commitment', { switchId, address });

    const fundingInfo = await checkAddressFunded(address, network || 'testnet');

    if (!fundingInfo) {
      logger.debug('Commitment not yet funded', { switchId, address });
      return;
    }

    logger.info('Bitcoin commitment funded!', {
      switchId,
      title,
      txid: fundingInfo.txid,
      amount: fundingInfo.amount,
      confirmed: fundingInfo.confirmed
    });

    // Update the database
    const newStatus = fundingInfo.confirmed ? 'confirmed' : 'pending';
    await query(
      `UPDATE switches SET
        bitcoin_status = $1,
        bitcoin_txid = $2,
        bitcoin_amount = $3,
        bitcoin_block_height = $4,
        bitcoin_confirmed_at = CASE WHEN $5 THEN NOW() ELSE NULL END,
        updated_at = NOW()
       WHERE id = $6`,
      [
        newStatus,
        fundingInfo.txid,
        fundingInfo.amount,
        fundingInfo.blockHeight,
        fundingInfo.confirmed,
        switchId
      ]
    );

    // Send WebSocket notification
    websocketService.notifyBitcoinFunded(userId, {
      switchId,
      title,
      txid: fundingInfo.txid,
      amount: fundingInfo.amount,
      confirmed: fundingInfo.confirmed,
      blockHeight: fundingInfo.blockHeight ?? undefined,
      explorerUrl: fundingInfo.explorerUrl,
      network: network || 'testnet'
    });

    // Create audit log entry
    await query(
      `INSERT INTO audit_log (user_id, event_type, event_data)
       VALUES ($1, $2, $3)`,
      [
        userId,
        'BITCOIN_COMMITMENT_FUNDED',
        JSON.stringify({
          switchId,
          title,
          txid: fundingInfo.txid,
          amount: fundingInfo.amount,
          confirmed: fundingInfo.confirmed,
          address
        })
      ]
    );

    logger.info('Bitcoin commitment updated successfully', {
      switchId,
      newStatus,
      txid: fundingInfo.txid
    });
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to update Bitcoin commitment', {
      switchId,
      address,
      error: error.message
    });
  }
}

/**
 * Check for confirmed transactions (previously pending tx now confirmed)
 */
export async function checkConfirmations(): Promise<void> {
  try {
    // Find commitments with txid but waiting for confirmation
    const result = await query<CommitmentRow>(
      `SELECT
        s.id,
        s.user_id,
        s.title,
        s.bitcoin_txid,
        s.bitcoin_network,
        s.bitcoin_address
       FROM switches s
       WHERE s.bitcoin_status = 'pending'
         AND s.bitcoin_txid IS NOT NULL
         AND s.status = 'ARMED'
       ORDER BY s.created_at ASC
       LIMIT 10`
    );

    for (const commitment of result.rows) {
      await checkTransactionConfirmation(commitment);
      await new Promise(resolve => setTimeout(resolve, API_DELAY_MS));
    }
  } catch (err) {
    const error = err as Error;
    logger.error('Error checking confirmations:', error);
  }
}

/**
 * Check if a specific transaction is now confirmed
 */
async function checkTransactionConfirmation(commitment: CommitmentRow): Promise<void> {
  const { id: switchId, user_id: userId, title, bitcoin_txid: txid, bitcoin_network: network, bitcoin_amount } = commitment;

  if (!txid) return;

  const baseUrl = network === 'mainnet' ? BLOCKSTREAM_MAINNET : BLOCKSTREAM_TESTNET;

  try {
    const response = await fetch(`${baseUrl}/tx/${txid}`);
    if (!response.ok) return;

    const tx = await response.json() as BlockstreamTransaction;

    if (tx.status?.confirmed) {
      await query(
        `UPDATE switches SET
          bitcoin_status = 'confirmed',
          bitcoin_block_height = $1,
          bitcoin_confirmed_at = NOW(),
          updated_at = NOW()
         WHERE id = $2`,
        [tx.status.block_height, switchId]
      );

      const explorerUrl = network === 'mainnet'
        ? `https://mempool.space/tx/${txid}`
        : `https://mempool.space/testnet/tx/${txid}`;

      websocketService.notifyBitcoinFunded(userId, {
        switchId,
        title,
        txid,
        amount: bitcoin_amount || 0,
        confirmed: true,
        blockHeight: tx.status.block_height,
        explorerUrl,
        network: network || 'testnet'
      });

      logger.info('Bitcoin transaction confirmed', { switchId, txid, blockHeight: tx.status.block_height });
    }
  } catch (err) {
    const error = err as Error;
    logger.error('Error checking tx confirmation:', { txid, error: error.message });
  }
}

/**
 * Start the Bitcoin funding monitor cron job
 * Runs every 2 minutes
 */
export function startBitcoinFundingMonitor(): ScheduledTask | null {
  // Only start if Bitcoin feature is enabled
  if (process.env.USE_BITCOIN_TIMELOCK !== 'true') {
    logger.info('Bitcoin funding monitor disabled (USE_BITCOIN_TIMELOCK != true)');
    return null;
  }

  // Cron expression: "*/2 * * * *" = every 2 minutes
  const cronExpression = '*/2 * * * *';

  logger.info('Starting Bitcoin funding monitor cron job', {
    schedule: 'Every 2 minutes',
    cronExpression
  });

  // Schedule the job
  const job = cron.schedule(cronExpression, async () => {
    await checkPendingCommitments();
    await checkConfirmations();
  });

  // Run immediately on startup if configured
  if (process.env.RUN_BITCOIN_MONITOR_ON_STARTUP === 'true') {
    logger.info('Running Bitcoin funding monitor immediately on startup');
    checkPendingCommitments().catch(error => {
      logger.error('Startup Bitcoin check failed:', error);
    });
  }

  return job;
}

/**
 * Stop the Bitcoin funding monitor
 */
export function stopBitcoinFundingMonitor(job: ScheduledTask | null): void {
  if (job) {
    job.stop();
    logger.info('Bitcoin funding monitor stopped');
  }
}

// Export for manual testing
export default {
  startBitcoinFundingMonitor,
  stopBitcoinFundingMonitor,
  checkPendingCommitments,
  checkConfirmations,
  checkAddressFunded
};
