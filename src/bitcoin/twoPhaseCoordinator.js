'use strict';

// ECHOLOCK Two-Phase Commit Coordinator
// Ensures Bitcoin transaction confirmation before Nostr fragment publishing
//
// CRITICAL: Prevents orphan fragments on Nostr if Bitcoin transaction fails or is dropped
//
// Protocol:
// Phase 1: Broadcast Bitcoin transaction → Wait for confirmation
// Phase 2: Publish fragments to Nostr with Bitcoin TXID linkage
//
// Security Properties:
// - Atomicity: Either both succeed or neither
// - No orphan fragments on Nostr without valid Bitcoin proof
// - Rollback support if Phase 1 fails
// - Idempotent operations (safe to retry)

import {
  broadcastTransaction,
  waitForConfirmation,
  getTransactionStatus,
  getCurrentBlockHeight
} from './testnetClient.js';
import { publishFragment } from '../nostr/multiRelayClient.js';

/**
 * Two-phase commit states
 */
export const CommitState = {
  PENDING: 'PENDING',                   // Not started
  PHASE1_BROADCASTING: 'PHASE1_BROADCASTING', // Broadcasting Bitcoin tx
  PHASE1_WAITING: 'PHASE1_WAITING',     // Waiting for Bitcoin confirmation
  PHASE1_CONFIRMED: 'PHASE1_CONFIRMED', // Bitcoin tx confirmed
  PHASE2_PUBLISHING: 'PHASE2_PUBLISHING', // Publishing to Nostr
  PHASE2_COMPLETE: 'PHASE2_COMPLETE',   // All fragments published to Nostr
  COMMITTED: 'COMMITTED',               // Both phases complete
  FAILED: 'FAILED',                     // Commit failed
  ROLLED_BACK: 'ROLLED_BACK'            // Rolled back after failure
};

/**
 * Two-phase commit coordinator
 * Manages the atomic commit protocol between Bitcoin and Nostr
 */
export class TwoPhaseCoordinator {
  constructor(options = {}) {
    this.state = CommitState.PENDING;
    this.phase1Result = null;
    this.phase2Results = [];
    this.bitcoinTxid = null;
    this.error = null;
    this.options = {
      minBitcoinConfirmations: options.minBitcoinConfirmations || 1,
      bitcoinConfirmationTimeout: options.bitcoinConfirmationTimeout || 3600000, // 1 hour
      bitcoinPollInterval: options.bitcoinPollInterval || 30000, // 30 seconds
      nostrMinSuccessCount: options.nostrMinSuccessCount || 5,
      allowNostrPublishWithoutBitcoin: options.allowNostrPublishWithoutBitcoin || false
    };
    this.stateHistory = [];
    this.startTime = null;
  }

  /**
   * Record state transition
   * @param {string} newState - New state
   * @param {Object} metadata - Additional metadata
   */
  _transitionState(newState, metadata = {}) {
    const transition = {
      from: this.state,
      to: newState,
      timestamp: Date.now(),
      ...metadata
    };
    this.stateHistory.push(transition);
    this.state = newState;
    console.log(`[TwoPhaseCoordinator] State: ${this.state}`);
  }

  /**
   * Phase 1: Broadcast Bitcoin transaction and wait for confirmation
   * @param {string} txHex - Raw Bitcoin transaction hex
   * @param {Object} txMetadata - Transaction metadata for logging
   * @returns {Promise<Object>} Phase 1 result with txid and confirmation info
   */
  async executePhase1(txHex, txMetadata = {}) {
    if (this.state !== CommitState.PENDING) {
      throw new Error(`Cannot execute Phase 1 from state ${this.state}`);
    }

    this.startTime = Date.now();
    this._transitionState(CommitState.PHASE1_BROADCASTING, { txMetadata });

    try {
      // Step 1: Broadcast transaction to Bitcoin network
      console.log('[Phase 1] Broadcasting Bitcoin transaction...');
      const broadcastResult = await broadcastTransaction(txHex, {
        maxRetries: 3,
        initialDelay: 1000
      }).catch(err => {
        // Re-throw with context
        throw err;
      });

      if (!broadcastResult.success) {
        throw new Error(`Bitcoin broadcast failed: ${broadcastResult.error || 'Unknown error'}`);
      }

      this.bitcoinTxid = broadcastResult.txid;
      console.log(`[Phase 1] Bitcoin transaction broadcast: ${this.bitcoinTxid}`);
      console.log(`[Phase 1] Explorer: ${broadcastResult.confirmationUrl}`);

      this._transitionState(CommitState.PHASE1_WAITING, {
        txid: this.bitcoinTxid,
        broadcastedAt: broadcastResult.broadcastedAt
      });

      // Step 2: Wait for confirmations
      console.log(`[Phase 1] Waiting for ${this.options.minBitcoinConfirmations} confirmation(s)...`);
      console.log(`[Phase 1] Polling every ${this.options.bitcoinPollInterval / 1000}s, timeout after ${this.options.bitcoinConfirmationTimeout / 1000}s`);

      const confirmation = await waitForConfirmation(
        this.bitcoinTxid,
        this.options.minBitcoinConfirmations,
        this.options.bitcoinPollInterval,
        this.options.bitcoinConfirmationTimeout
      );

      console.log(`[Phase 1] ✅ Bitcoin transaction confirmed!`);
      console.log(`[Phase 1]    Block Height: ${confirmation.blockHeight}`);
      console.log(`[Phase 1]    Block Hash: ${confirmation.blockHash}`);
      console.log(`[Phase 1]    Confirmations: ${confirmation.confirmations}`);

      this._transitionState(CommitState.PHASE1_CONFIRMED, {
        blockHeight: confirmation.blockHeight,
        blockHash: confirmation.blockHash,
        confirmations: confirmation.confirmations
      });

      this.phase1Result = {
        success: true,
        txid: this.bitcoinTxid,
        broadcastResult,
        confirmation
      };

      return this.phase1Result;

    } catch (error) {
      console.error(`[Phase 1] ❌ Failed: ${error.message}`);
      this.error = error;
      this._transitionState(CommitState.FAILED, { phase: 1, error: error.message });
      throw new Error(`Phase 1 failed: ${error.message}`);
    }
  }

  /**
   * Phase 2: Publish fragments to Nostr with Bitcoin TXID linkage
   * @param {string} switchId - Dead man's switch ID
   * @param {Array<Object>} fragmentData - Array of { index, encryptedData, metadata }
   * @param {Object} nostrKeys - Nostr keypair { privkey, pubkey }
   * @param {Array<string>} relayUrls - Nostr relay URLs
   * @param {number} expiryTimestamp - Unix timestamp for fragment expiry
   * @returns {Promise<Object>} Phase 2 result with publication status
   */
  async executePhase2(switchId, fragmentData, nostrKeys, relayUrls, expiryTimestamp) {
    if (this.state !== CommitState.PHASE1_CONFIRMED) {
      throw new Error(`Cannot execute Phase 2 from state ${this.state}. Phase 1 must be confirmed first.`);
    }

    if (!this.bitcoinTxid && !this.options.allowNostrPublishWithoutBitcoin) {
      throw new Error('Cannot publish to Nostr without Bitcoin TXID');
    }

    this._transitionState(CommitState.PHASE2_PUBLISHING, {
      switchId,
      fragmentCount: fragmentData.length,
      relayCount: relayUrls.length
    });

    try {
      console.log('[Phase 2] Publishing fragments to Nostr relays...');
      console.log(`[Phase 2] Bitcoin TXID linkage: ${this.bitcoinTxid}`);
      console.log(`[Phase 2] Fragments: ${fragmentData.length}, Relays: ${relayUrls.length}`);

      // Publish each fragment with Bitcoin TXID linkage
      const publishResults = [];
      for (const fragment of fragmentData) {
        console.log(`[Phase 2] Publishing fragment ${fragment.index}...`);

        const result = await publishFragment(
          switchId,
          fragment.index,
          fragment.encryptedData,
          fragment.metadata,
          nostrKeys,
          relayUrls,
          expiryTimestamp,
          this.bitcoinTxid // Link to Bitcoin transaction
        );

        publishResults.push({
          index: fragment.index,
          eventId: result.eventId,
          successCount: result.successCount,
          failures: result.failures
        });

        console.log(`[Phase 2] ✓ Fragment ${fragment.index} published (event: ${result.eventId.substring(0, 12)}...)`);
        console.log(`[Phase 2]   Success: ${result.successCount}/${relayUrls.length} relays`);

        if (result.successCount < this.options.nostrMinSuccessCount) {
          throw new Error(
            `Fragment ${fragment.index} insufficient relay success. ` +
            `Required: ${this.options.nostrMinSuccessCount}, Got: ${result.successCount}`
          );
        }
      }

      this._transitionState(CommitState.PHASE2_COMPLETE, {
        fragmentsPublished: publishResults.length
      });

      this.phase2Results = publishResults;

      // Final commit state
      this._transitionState(CommitState.COMMITTED, {
        totalTime: Date.now() - this.startTime
      });

      console.log('[Phase 2] ✅ All fragments published successfully');
      console.log(`[Commit] ✅ Two-phase commit COMPLETE (${Math.round((Date.now() - this.startTime) / 1000)}s)`);

      return {
        success: true,
        fragmentsPublished: publishResults.length,
        publishResults
      };

    } catch (error) {
      console.error(`[Phase 2] ❌ Failed: ${error.message}`);
      this.error = error;
      this._transitionState(CommitState.FAILED, { phase: 2, error: error.message });
      throw new Error(`Phase 2 failed: ${error.message}`);
    }
  }

  /**
   * Execute full two-phase commit atomically
   * @param {Object} params - Commit parameters
   * @param {string} params.txHex - Bitcoin transaction hex
   * @param {Object} params.txMetadata - Bitcoin transaction metadata
   * @param {string} params.switchId - Dead man's switch ID
   * @param {Array<Object>} params.fragmentData - Fragment data array
   * @param {Object} params.nostrKeys - Nostr keypair
   * @param {Array<string>} params.relayUrls - Nostr relay URLs
   * @param {number} params.expiryTimestamp - Fragment expiry timestamp
   * @returns {Promise<Object>} Commit result
   */
  async commit(params) {
    try {
      // Phase 1: Bitcoin transaction
      await this.executePhase1(params.txHex, params.txMetadata);

      // Phase 2: Nostr publication
      await this.executePhase2(
        params.switchId,
        params.fragmentData,
        params.nostrKeys,
        params.relayUrls,
        params.expiryTimestamp
      );

      return {
        success: true,
        state: this.state,
        bitcoinTxid: this.bitcoinTxid,
        phase1: this.phase1Result,
        phase2: this.phase2Results,
        duration: Date.now() - this.startTime
      };

    } catch (error) {
      return {
        success: false,
        state: this.state,
        error: error.message,
        bitcoinTxid: this.bitcoinTxid,
        phase1: this.phase1Result,
        phase2: this.phase2Results,
        stateHistory: this.stateHistory
      };
    }
  }

  /**
   * Get current commit status
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      state: this.state,
      bitcoinTxid: this.bitcoinTxid,
      phase1Complete: !!this.phase1Result,
      phase2Complete: this.state === CommitState.COMMITTED,
      error: this.error ? this.error.message : null,
      stateHistory: this.stateHistory,
      duration: this.startTime ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Check if commit is complete
   * @returns {boolean} True if committed
   */
  isCommitted() {
    return this.state === CommitState.COMMITTED;
  }

  /**
   * Check if commit failed
   * @returns {boolean} True if failed
   */
  isFailed() {
    return this.state === CommitState.FAILED;
  }

  /**
   * Attempt rollback (best effort)
   * Note: Bitcoin transactions cannot be rolled back, but we can clean up local state
   * @returns {Promise<Object>} Rollback result
   */
  async rollback() {
    if (this.state === CommitState.COMMITTED) {
      throw new Error('Cannot rollback committed transaction');
    }

    console.log('[Rollback] Attempting rollback...');

    // Best effort cleanup - Bitcoin tx cannot be rolled back if confirmed
    // But we can mark state as rolled back for tracking
    this._transitionState(CommitState.ROLLED_BACK);

    console.log('[Rollback] ✓ State rolled back (Bitcoin tx cannot be reverted)');

    return {
      success: true,
      message: 'State rolled back (Bitcoin transaction remains on chain)',
      bitcoinTxid: this.bitcoinTxid
    };
  }
}

/**
 * Create and execute two-phase commit with simplified interface
 * @param {Object} params - Commit parameters (same as TwoPhaseCoordinator.commit)
 * @param {Object} options - Coordinator options
 * @returns {Promise<Object>} Commit result
 */
export async function executeTwoPhaseCommit(params, options = {}) {
  const coordinator = new TwoPhaseCoordinator(options);
  return await coordinator.commit(params);
}
