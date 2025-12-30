/**
 * Recovery Module
 *
 * Recipient-side tools for message recovery without any server.
 *
 * @see CLAUDE.md - Phase 5: Full Autonomy
 */

export * from './types';
export * from './recover';

export {
  createRecoverySession,
  collectReleasedShares,
  decryptShares,
  reconstructKey,
  fetchEncryptedMessage,
  decryptMessage,
  recoverMessage,
  checkRecoveryStatus,
} from './recover';
